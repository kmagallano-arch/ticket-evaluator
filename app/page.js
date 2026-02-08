'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default function TicketGrader() {
  const [ticketContent, setTicketContent] = useState('');
  const [activeTab, setActiveTab] = useState('grade');
  const [savedResults, setSavedResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [selectedResult, setSelectedResult] = useState(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  const escalationAgents = ['JB', 'Arche', 'Princess', 'Cess', 'Analie', 'Randel', 'Ardylyn'];
  const evaluators = ['AI-QA', 'Donna', 'Jamaica', 'Ara', 'Jen', 'Van', 'Karen', 'Victor'];
  
  const [agentEvaluations, setAgentEvaluations] = useState([]);
  const [currentAgentIndex, setCurrentAgentIndex] = useState(0);
  const [isEscalationAgent, setIsEscalationAgent] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [ticketLink, setTicketLink] = useState('');
  const [evaluatorName, setEvaluatorName] = useState('');
  const [aiReasoning, setAiReasoning] = useState('');
  const [detectedTriggers, setDetectedTriggers] = useState([]);
  const [detectedBuzzwords, setDetectedBuzzwords] = useState([]);
  const [zeroToleranceViolation, setZeroToleranceViolation] = useState(false);
  const [violationNotes, setViolationNotes] = useState('');
  const [shopifyNotes, setShopifyNotes] = useState('');
  const [shopifyScreenshots, setShopifyScreenshots] = useState([]);
  
  const [softSkills, setSoftSkills] = useState({ tone: 0, empathy: 0, professionalism: 0, clarity: 0 });
  const [softSkillsExp, setSoftSkillsExp] = useState({ tone: '', empathy: '', professionalism: '', clarity: '' });
  const [issueUnderstanding, setIssueUnderstanding] = useState({ correctIdentification: 0, rootCauseAnalysis: 0, customerContext: 0, escalationRecognition: 0 });
  const [issueUnderstandingExp, setIssueUnderstandingExp] = useState({ correctIdentification: '', rootCauseAnalysis: '', customerContext: '', escalationRecognition: '' });
  const [productProcess, setProductProcess] = useState({ policyAccuracy: 0, sopAdherence: 0, solutionCorrectness: 0, escalationProcess: 0 });
  const [productProcessExp, setProductProcessExp] = useState({ policyAccuracy: '', sopAdherence: '', solutionCorrectness: '', escalationProcess: '' });
  const [toolsUtilization, setToolsUtilization] = useState({ gorgiasUsage: 0, internalNotes: 0, shopifyUsage: 0 });
  const [toolsUtilizationExp, setToolsUtilizationExp] = useState({ gorgiasUsage: '', internalNotes: '', shopifyUsage: '' });
  const [comments, setComments] = useState('');

  const buzzwords = ['legal', 'lawyer', 'attorney', 'lawsuit', 'sue', 'court', 'chargeback', 'dispute charge', 'consumer affairs', 'consumer protection', 'ftc', 'federal trade', 'bbb', 'better business bureau', 'attorney general', 'small claims'];
  const otherTriggers = ['fraud', 'police', 'fire', 'smoke', 'overheating', 'injury', 'property damage', 'safety', 'hazard', 'review', 'social media', 'going public', 'manager', 'supervisor', 'threaten', 'ultimatum'];

  useEffect(() => { loadSavedResults(); }, []);
  useEffect(() => { setIsEscalationAgent(escalationAgents.some(ea => agentName.toLowerCase().includes(ea.toLowerCase()))); }, [agentName]);

  const loadSavedResults = async () => {
    if (!supabase) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('evaluations').select('*').order('timestamp', { ascending: false });
      if (error) throw error;
      setSavedResults(data.map(row => ({
        id: row.id, ticketId: row.ticket_id, agentName: row.agent_name, ticketLink: row.ticket_link,
        evaluatorName: row.evaluator_name, isEscalationAgent: row.is_escalation_agent, date: row.date,
        timestamp: row.timestamp, zeroToleranceViolation: row.zero_tolerance_violation,
        violationNotes: row.violation_notes, scores: row.scores, finalScore: parseFloat(row.final_score),
        grade: row.grade, comments: row.comments, aiReasoning: row.ai_reasoning,
        detectedBuzzwords: row.detected_buzzwords || [], detectedTriggers: row.detected_triggers || [], 
        manualMode: row.manual_mode, shopifyNotes: row.shopify_notes, shopifyScreenshots: row.shopify_screenshots || []
      })));
    } catch(e) { console.error('Load error:', e); }
    setIsLoading(false);
  };

  const detectTriggers = (text) => {
    const lower = text.toLowerCase();
    return { buzzwords: buzzwords.filter(b => lower.includes(b)), other: otherTriggers.filter(t => lower.includes(t)) };
  };

  const handleShopifyPaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = (event) => { setShopifyScreenshots(prev => [...prev, event.target.result]); };
        reader.readAsDataURL(blob);
      }
    }
  };

  const removeScreenshot = (index) => { setShopifyScreenshots(prev => prev.filter((_, i) => i !== index)); };

  const analyzeTicket = async () => {
    if (!ticketContent.trim()) return;
    setIsAnalyzing(true); setAnalysisComplete(false); setManualMode(false);
    setAgentEvaluations([]); setCurrentAgentIndex(0);
    const { buzzwords: foundBuzz, other: foundOther } = detectTriggers(ticketContent);
    setDetectedBuzzwords(foundBuzz); setDetectedTriggers(foundOther);
    
    // Build messages array with text and images
    const content = [];
    
    // Add text prompt
    const textPrompt = `You are a QA analyst evaluating a customer support ticket. This ticket may have been handled by MULTIPLE agents.

ZERO TOLERANCE POLICY (BUZZWORDS) - Legal threats requiring IMMEDIATE escalation:
Legal/Lawyer/Attorney/Lawsuit/Sue/Court, Chargeback/Dispute charge, Consumer Affairs/FTC/BBB/Attorney General

ESCALATION TEAM: ${escalationAgents.join(', ')} - evaluate their resolution quality, not escalation compliance.

TICKET CONVERSATION:
${ticketContent}

${shopifyNotes ? `SHOPIFY DETAILS (pasted by evaluator):
${shopifyNotes}` : ''}

Detected buzzwords: ${foundBuzz.join(', ') || 'None'}
Other triggers: ${foundOther.join(', ') || 'None'}

${shopifyScreenshots.length > 0 ? `IMPORTANT: ${shopifyScreenshots.length} Shopify screenshot(s) are attached. Analyze them to verify:
- If agent claimed to process a refund, check if refund shows in Shopify
- If agent said order was put on hold, verify the hold status
- If agent mentioned cancellation, confirm it in Shopify
- Check order timeline, notes, and any discrepancies between what agent said and what Shopify shows` : ''}

TOOLS UTILIZATION scoring:
- Gorgias Usage: How well agent uses the helpdesk platform
- Internal Notes: Quality of internal documentation
- Shopify Usage: Did agent correctly perform actions in Shopify? If they said they refunded/held/cancelled, does Shopify confirm this? Score based on accuracy and proper documentation.

Respond ONLY with JSON:
{"ticketId":"extracted ID","agents":[{"agentName":"Name","isEscalationAgent":false,"zeroToleranceViolation":false,"violationNotes":"","scores":{"softSkills":{"tone":{"score":1-5,"explanation":"why"},"empathy":{"score":1-5,"explanation":"why"},"professionalism":{"score":1-5,"explanation":"why"},"clarity":{"score":1-5,"explanation":"why"}},"issueUnderstanding":{"correctIdentification":{"score":1-5,"explanation":"why"},"rootCauseAnalysis":{"score":1-5,"explanation":"why"},"customerContext":{"score":1-5,"explanation":"why"},"escalationRecognition":{"score":1-5,"explanation":"why"}},"productProcess":{"policyAccuracy":{"score":1-5,"explanation":"why"},"sopAdherence":{"score":1-5,"explanation":"why"},"solutionCorrectness":{"score":1-5,"explanation":"why"},"escalationProcess":{"score":1-5,"explanation":"why"}},"toolsUtilization":{"gorgiasUsage":{"score":1-5,"explanation":"why"},"internalNotes":{"score":1-5,"explanation":"why"},"shopifyUsage":{"score":1-5,"explanation":"Based on Shopify screenshots/notes: describe what was verified and any discrepancies found"}}},"overallAnalysis":"analysis","suggestedFeedback":"coaching"}]}`;

    content.push({ type: 'text', text: textPrompt });
    
    // Add images if present
    for (const screenshot of shopifyScreenshots) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: screenshot.split(';')[0].split(':')[1],
          data: screenshot.split(',')[1]
        }
      });
    }

    try {
      const res = await fetch('/api/analyze', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ content, hasImages: shopifyScreenshots.length > 0 }) 
      });
      const data = await res.json();
      console.log('API response:', data);
      if (data.error) {
        console.error('API error:', data.error, data.rawResponse);
        throw new Error(data.error);
      }
      setTicketId(data.ticketId || '');
      if (data.agents?.length > 0) {
        const evals = data.agents.map(agent => ({
          agentName: agent.agentName, isEscalationAgent: agent.isEscalationAgent || escalationAgents.some(ea => agent.agentName?.toLowerCase().includes(ea.toLowerCase())),
          zeroToleranceViolation: agent.zeroToleranceViolation || false, violationNotes: agent.violationNotes || '',
          softSkills: { tone: agent.scores?.softSkills?.tone?.score || 3, empathy: agent.scores?.softSkills?.empathy?.score || 3, professionalism: agent.scores?.softSkills?.professionalism?.score || 3, clarity: agent.scores?.softSkills?.clarity?.score || 3 },
          softSkillsExp: { tone: agent.scores?.softSkills?.tone?.explanation || '', empathy: agent.scores?.softSkills?.empathy?.explanation || '', professionalism: agent.scores?.softSkills?.professionalism?.explanation || '', clarity: agent.scores?.softSkills?.clarity?.explanation || '' },
          issueUnderstanding: { correctIdentification: agent.scores?.issueUnderstanding?.correctIdentification?.score || 3, rootCauseAnalysis: agent.scores?.issueUnderstanding?.rootCauseAnalysis?.score || 3, customerContext: agent.scores?.issueUnderstanding?.customerContext?.score || 3, escalationRecognition: agent.scores?.issueUnderstanding?.escalationRecognition?.score || 3 },
          issueUnderstandingExp: { correctIdentification: agent.scores?.issueUnderstanding?.correctIdentification?.explanation || '', rootCauseAnalysis: agent.scores?.issueUnderstanding?.rootCauseAnalysis?.explanation || '', customerContext: agent.scores?.issueUnderstanding?.customerContext?.explanation || '', escalationRecognition: agent.scores?.issueUnderstanding?.escalationRecognition?.explanation || '' },
          productProcess: { policyAccuracy: agent.scores?.productProcess?.policyAccuracy?.score || 3, sopAdherence: agent.scores?.productProcess?.sopAdherence?.score || 3, solutionCorrectness: agent.scores?.productProcess?.solutionCorrectness?.score || 3, escalationProcess: agent.scores?.productProcess?.escalationProcess?.score || 3 },
          productProcessExp: { policyAccuracy: agent.scores?.productProcess?.policyAccuracy?.explanation || '', sopAdherence: agent.scores?.productProcess?.sopAdherence?.explanation || '', solutionCorrectness: agent.scores?.productProcess?.solutionCorrectness?.explanation || '', escalationProcess: agent.scores?.productProcess?.escalationProcess?.explanation || '' },
          toolsUtilization: { gorgiasUsage: agent.scores?.toolsUtilization?.gorgiasUsage?.score || 3, internalNotes: agent.scores?.toolsUtilization?.internalNotes?.score || 3, shopifyUsage: agent.scores?.toolsUtilization?.shopifyUsage?.score || 3 },
          toolsUtilizationExp: { gorgiasUsage: agent.scores?.toolsUtilization?.gorgiasUsage?.explanation || '', internalNotes: agent.scores?.toolsUtilization?.internalNotes?.explanation || '', shopifyUsage: agent.scores?.toolsUtilization?.shopifyUsage?.explanation || '' },
          aiReasoning: agent.overallAnalysis || '', comments: agent.suggestedFeedback || '', shopifyNotes: '', shopifyScreenshots: []
        }));
        setAgentEvaluations(evals);
        loadAgentData(0, evals);
      }
    } catch(e) { console.error('Analysis error:', e); setManualMode(true); }
    setAnalysisComplete(true); setIsAnalyzing(false);
  };

  const loadAgentData = (index, agents = agentEvaluations) => {
    const a = agents[index]; if (!a) return;
    setAgentName(a.agentName); setIsEscalationAgent(a.isEscalationAgent);
    setZeroToleranceViolation(a.zeroToleranceViolation); setViolationNotes(a.violationNotes);
    setSoftSkills(a.softSkills); setSoftSkillsExp(a.softSkillsExp);
    setIssueUnderstanding(a.issueUnderstanding); setIssueUnderstandingExp(a.issueUnderstandingExp);
    setProductProcess(a.productProcess); setProductProcessExp(a.productProcessExp);
    setToolsUtilization(a.toolsUtilization); setToolsUtilizationExp(a.toolsUtilizationExp);
    setAiReasoning(a.aiReasoning); setComments(a.comments);
    setCurrentAgentIndex(index);
  };

  const saveCurrentAgent = () => {
    const updated = [...agentEvaluations];
    updated[currentAgentIndex] = { agentName, isEscalationAgent, zeroToleranceViolation, violationNotes, softSkills, softSkillsExp, issueUnderstanding, issueUnderstandingExp, productProcess, productProcessExp, toolsUtilization, toolsUtilizationExp, aiReasoning, comments };
    setAgentEvaluations(updated);
    return updated;
  };

  const switchAgent = (idx) => { saveCurrentAgent(); loadAgentData(idx); };

  const addNewAgent = () => {
    const updated = saveCurrentAgent();
    const newAgent = { agentName: '', isEscalationAgent: false, zeroToleranceViolation: false, violationNotes: '',
      softSkills: { tone: 0, empathy: 0, professionalism: 0, clarity: 0 }, softSkillsExp: { tone: '', empathy: '', professionalism: '', clarity: '' },
      issueUnderstanding: { correctIdentification: 0, rootCauseAnalysis: 0, customerContext: 0, escalationRecognition: 0 }, issueUnderstandingExp: { correctIdentification: '', rootCauseAnalysis: '', customerContext: '', escalationRecognition: '' },
      productProcess: { policyAccuracy: 0, sopAdherence: 0, solutionCorrectness: 0, escalationProcess: 0 }, productProcessExp: { policyAccuracy: '', sopAdherence: '', solutionCorrectness: '', escalationProcess: '' },
      toolsUtilization: { gorgiasUsage: 0, internalNotes: 0, shopifyUsage: 0 }, toolsUtilizationExp: { gorgiasUsage: '', internalNotes: '', shopifyUsage: '' },
      aiReasoning: '', comments: '' };
    setAgentEvaluations([...updated, newAgent]);
    loadAgentData(updated.length, [...updated, newAgent]);
  };

  const removeAgent = (idx) => {
    if (agentEvaluations.length <= 1) return;
    const updated = agentEvaluations.filter((_, i) => i !== idx);
    setAgentEvaluations(updated);
    loadAgentData(idx >= updated.length ? updated.length - 1 : idx, updated);
  };

  const startManualMode = () => {
    const { buzzwords: foundBuzz, other: foundOther } = detectTriggers(ticketContent);
    setDetectedBuzzwords(foundBuzz); setDetectedTriggers(foundOther);
    setManualMode(true); setAnalysisComplete(true);
    const emptyAgent = { agentName: '', isEscalationAgent: false, zeroToleranceViolation: false, violationNotes: '',
      softSkills: { tone: 0, empathy: 0, professionalism: 0, clarity: 0 }, softSkillsExp: { tone: '', empathy: '', professionalism: '', clarity: '' },
      issueUnderstanding: { correctIdentification: 0, rootCauseAnalysis: 0, customerContext: 0, escalationRecognition: 0 }, issueUnderstandingExp: { correctIdentification: '', rootCauseAnalysis: '', customerContext: '', escalationRecognition: '' },
      productProcess: { policyAccuracy: 0, sopAdherence: 0, solutionCorrectness: 0, escalationProcess: 0 }, productProcessExp: { policyAccuracy: '', sopAdherence: '', solutionCorrectness: '', escalationProcess: '' },
      toolsUtilization: { gorgiasUsage: 0, internalNotes: 0, shopifyUsage: 0 }, toolsUtilizationExp: { gorgiasUsage: '', internalNotes: '', shopifyUsage: '' },
      aiReasoning: '', comments: '' };
    setAgentEvaluations([emptyAgent]); setCurrentAgentIndex(0);
  };

  const calcScore = (s) => (Object.values(s).reduce((a,v) => a+v, 0) / (Object.keys(s).length * 5)) * 100;
  const finalScore = zeroToleranceViolation ? 0 : calcScore(softSkills)*0.2 + calcScore(issueUnderstanding)*0.3 + calcScore(productProcess)*0.3 + calcScore(toolsUtilization)*0.2;
  const getColor = (s) => s >= 90 ? '#059669' : s >= 80 ? '#0891b2' : s >= 70 ? '#d97706' : s >= 60 ? '#ea580c' : '#dc2626';
  const getGrade = (s) => s >= 95 ? 'A+' : s >= 90 ? 'A' : s >= 85 ? 'B+' : s >= 80 ? 'B' : s >= 75 ? 'C+' : s >= 70 ? 'C' : s >= 60 ? 'D' : 'F';

  const saveResult = async () => {
    if (!supabase) { setSaveStatus('error'); setTimeout(() => setSaveStatus(''), 3000); return; }
    const updated = saveCurrentAgent();
    const agentsToSave = updated.length > 0 ? updated : [{ agentName, isEscalationAgent, zeroToleranceViolation, violationNotes, softSkills, softSkillsExp, issueUnderstanding, issueUnderstandingExp, productProcess, productProcessExp, toolsUtilization, toolsUtilizationExp, aiReasoning, comments }];
    try {
      for (const agent of agentsToSave) {
        const agentScore = agent.zeroToleranceViolation ? 0 : calcScore(agent.softSkills)*0.2 + calcScore(agent.issueUnderstanding)*0.3 + calcScore(agent.productProcess)*0.3 + calcScore(agent.toolsUtilization)*0.2;
        const dbRecord = {
          id: `ticket-${ticketId || Date.now()}-${agent.agentName || 'unknown'}-${Date.now()}`,
          ticket_id: ticketId, agent_name: agent.agentName, ticket_link: ticketLink, evaluator_name: evaluatorName,
          is_escalation_agent: agent.isEscalationAgent, date: new Date().toLocaleDateString(),
          zero_tolerance_violation: agent.zeroToleranceViolation, violation_notes: agent.violationNotes,
          scores: { softSkills: {...agent.softSkills, explanations: agent.softSkillsExp, categoryScore: calcScore(agent.softSkills)}, issueUnderstanding: {...agent.issueUnderstanding, explanations: agent.issueUnderstandingExp, categoryScore: calcScore(agent.issueUnderstanding)}, productProcess: {...agent.productProcess, explanations: agent.productProcessExp, categoryScore: calcScore(agent.productProcess)}, toolsUtilization: {...agent.toolsUtilization, explanations: agent.toolsUtilizationExp, categoryScore: calcScore(agent.toolsUtilization)} },
          final_score: agentScore, grade: agent.zeroToleranceViolation ? 'F' : getGrade(agentScore),
          comments: agent.comments, ai_reasoning: agent.aiReasoning,
          detected_buzzwords: detectedBuzzwords, detected_triggers: detectedTriggers, manual_mode: manualMode,
          shopify_notes: shopifyNotes, shopify_screenshots: shopifyScreenshots
        };
        const { error } = await supabase.from('evaluations').insert([dbRecord]);
        if (error) throw error;
      }
      setSaveStatus('saved'); await loadSavedResults();
      setTimeout(() => { setSaveStatus(''); resetForm(); }, 1500);
    } catch(e) { console.error('Save error:', e); setSaveStatus('error'); setTimeout(() => setSaveStatus(''), 3000); }
  };

  const deleteResult = async (id) => {
    if (!supabase) return;
    try { await supabase.from('evaluations').delete().eq('id', id); await loadSavedResults(); if (selectedResult?.id === id) setSelectedResult(null); } catch(e) { console.error('Delete error:', e); }
  };

  const resetForm = () => {
    setTicketContent(''); setAgentName(''); setTicketId(''); setTicketLink(''); setEvaluatorName('');
    setZeroToleranceViolation(false); setViolationNotes('');
    setSoftSkills({ tone: 0, empathy: 0, professionalism: 0, clarity: 0 }); setSoftSkillsExp({ tone: '', empathy: '', professionalism: '', clarity: '' });
    setIssueUnderstanding({ correctIdentification: 0, rootCauseAnalysis: 0, customerContext: 0, escalationRecognition: 0 }); setIssueUnderstandingExp({ correctIdentification: '', rootCauseAnalysis: '', customerContext: '', escalationRecognition: '' });
    setProductProcess({ policyAccuracy: 0, sopAdherence: 0, solutionCorrectness: 0, escalationProcess: 0 }); setProductProcessExp({ policyAccuracy: '', sopAdherence: '', solutionCorrectness: '', escalationProcess: '' });
    setToolsUtilization({ gorgiasUsage: 0, internalNotes: 0, shopifyUsage: 0 }); setToolsUtilizationExp({ gorgiasUsage: '', internalNotes: '', shopifyUsage: '' });
    setComments(''); setAiReasoning(''); setDetectedTriggers([]); setDetectedBuzzwords([]);
    setAnalysisComplete(false); setManualMode(false); setAgentEvaluations([]); setCurrentAgentIndex(0);
    setShopifyNotes(''); setShopifyScreenshots([]);
  };

  const getFilteredResults = () => {
    let filtered = [...savedResults];
    if (dateFilter === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate); start.setHours(0,0,0,0);
      const end = new Date(customEndDate); end.setHours(23,59,59,999);
      filtered = filtered.filter(r => { const d = new Date(r.timestamp); return d >= start && d <= end; });
    } else if (dateFilter !== 'all') {
      const now = new Date(); const filterDate = new Date();
      if (dateFilter === '7days') filterDate.setDate(now.getDate() - 7);
      else if (dateFilter === '30days') filterDate.setDate(now.getDate() - 30);
      else if (dateFilter === '90days') filterDate.setDate(now.getDate() - 90);
      filtered = filtered.filter(r => new Date(r.timestamp) >= filterDate);
    }
    if (agentFilter !== 'all') filtered = filtered.filter(r => r.agentName === agentFilter);
    return filtered;
  };

  const getAnalytics = () => {
    const filtered = getFilteredResults();
    if (filtered.length === 0) return null;
    const total = filtered.length;
    const avgScore = filtered.reduce((a, r) => a + r.finalScore, 0) / total;
    const zeroCount = filtered.filter(r => r.zeroToleranceViolation).length;
    const gradeDistribution = { 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'D': 0, 'F': 0 };
    filtered.forEach(r => { gradeDistribution[r.grade] = (gradeDistribution[r.grade] || 0) + 1; });
    const categoryAvg = { softSkills: filtered.reduce((a, r) => a + (r.scores?.softSkills?.categoryScore || 0), 0) / total, issueUnderstanding: filtered.reduce((a, r) => a + (r.scores?.issueUnderstanding?.categoryScore || 0), 0) / total, productProcess: filtered.reduce((a, r) => a + (r.scores?.productProcess?.categoryScore || 0), 0) / total, toolsUtilization: filtered.reduce((a, r) => a + (r.scores?.toolsUtilization?.categoryScore || 0), 0) / total };
    const agentStats = {};
    filtered.forEach(r => { if (!agentStats[r.agentName]) agentStats[r.agentName] = { name: r.agentName, totalScore: 0, count: 0, violations: 0, isEscalation: r.isEscalationAgent }; agentStats[r.agentName].totalScore += r.finalScore; agentStats[r.agentName].count += 1; if (r.zeroToleranceViolation) agentStats[r.agentName].violations += 1; });
    const agentPerformance = Object.values(agentStats).map(a => ({ ...a, avgScore: a.totalScore / a.count, grade: getGrade(a.totalScore / a.count) })).sort((a, b) => b.avgScore - a.avgScore);
    const evaluatorStats = {};
    filtered.forEach(r => { 
      if (!evaluatorStats[r.evaluatorName]) evaluatorStats[r.evaluatorName] = { name: r.evaluatorName, count: 0, totalScore: 0 }; 
      evaluatorStats[r.evaluatorName].count += 1; 
      evaluatorStats[r.evaluatorName].totalScore += r.finalScore;
    });
    const evaluatorPerformance = Object.values(evaluatorStats).map(e => ({ ...e, avgScore: e.totalScore / e.count, grade: getGrade(e.totalScore / e.count) })).sort((a, b) => b.count - a.count);
    return { totalEvaluations: total, avgScore, zeroToleranceCount: zeroCount, zeroToleranceRate: (zeroCount / total * 100), gradeDistribution, categoryAvg, agentPerformance, evaluatorPerformance, passingRate: (filtered.filter(r => r.finalScore >= 70).length / total * 100) };
  };

  const downloadFile = (content, filename, type) => { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); };
  const exportCSV = () => { const f = getFilteredResults(); const h = ['Date','Agent','Ticket ID','Evaluator','Score','Grade','Soft Skills','Issue Understanding','Product & Process','Tools','Zero Tolerance','Feedback']; const r = f.map(x => [x.date, x.agentName, x.ticketId, x.evaluatorName, x.finalScore.toFixed(1), x.grade, x.scores?.softSkills?.categoryScore?.toFixed(1)||'N/A', x.scores?.issueUnderstanding?.categoryScore?.toFixed(1)||'N/A', x.scores?.productProcess?.categoryScore?.toFixed(1)||'N/A', x.scores?.toolsUtilization?.categoryScore?.toFixed(1)||'N/A', x.zeroToleranceViolation?'Yes':'No', `"${(x.comments||'').replace(/"/g,'""')}"`]); downloadFile([h.join(','), ...r.map(x => x.join(','))].join('\n'), 'evaluations.csv', 'text/csv'); };
  const exportJSON = () => downloadFile(JSON.stringify(getFilteredResults(), null, 2), 'evaluations.json', 'application/json');

  const uniqueAgents = [...new Set(savedResults.map(r => r.agentName))].filter(Boolean);
  const showExp = !manualMode && agentEvaluations.length > 0;

  const Rating = ({ label, value, onChange, desc, explanation }) => (
    <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div><div style={{ fontSize: '14px', fontWeight: '500', color: '#e2e8f0' }}>{label}</div>{desc && <div style={{ fontSize: '11px', color: '#64748b' }}>{desc}</div>}</div>
        <div style={{ display: 'flex', gap: '4px' }}>{[1,2,3,4,5].map(n => <button key={n} onClick={() => onChange(n)} style={{ width: '36px', height: '36px', borderRadius: '6px', border: 'none', background: value >= n ? '#6366f1' : 'rgba(255,255,255,0.08)', color: value >= n ? '#fff' : '#64748b', cursor: 'pointer', fontWeight: '600' }}>{n}</button>)}</div>
      </div>
      {showExp && explanation && <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(99,102,241,0.1)', borderRadius: '6px', border: '1px solid rgba(99,102,241,0.2)' }}><div style={{ fontSize: '11px', color: '#a5b4fc', marginBottom: '4px' }}>🤖 AI:</div><div style={{ fontSize: '12px', color: '#e2e8f0', lineHeight: '1.5' }}>{explanation}</div></div>}
    </div>
  );

  const Category = ({ title, weight, scores, setScores, explanations, fields, color }) => (
    <div style={{ background: 'linear-gradient(135deg, rgba(30,30,40,0.9), rgba(20,20,30,0.95))', borderRadius: '16px', padding: '24px', marginBottom: '20px', border: `1px solid ${color}22` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div><h3 style={{ margin: 0, fontSize: '18px', color: '#f1f5f9' }}>{title}</h3><span style={{ fontSize: '12px', color }}>{weight}%</span></div>
        <div style={{ background: `${color}22`, color, padding: '8px 16px', borderRadius: '20px', fontWeight: '700' }}>{calcScore(scores).toFixed(0)}%</div>
      </div>
      {fields.map(f => <Rating key={f.key} label={f.label} desc={f.desc} value={scores[f.key]} onChange={v => setScores({...scores, [f.key]: v})} explanation={explanations?.[f.key]} />)}
    </div>
  );

  const ProgressBar = ({ value, color, label }) => (<div style={{ marginBottom: '12px' }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span style={{ fontSize: '13px', color: '#94a3b8' }}>{label}</span><span style={{ fontSize: '13px', color, fontWeight: '600' }}>{value.toFixed(1)}%</span></div><div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.min(value, 100)}%`, background: color, borderRadius: '4px' }}></div></div></div>);

  const issueFields = isEscalationAgent ? [{key:'correctIdentification',label:'Issue Identification',desc:'Accurately identifies problem'},{key:'rootCauseAnalysis',label:'Root Cause Analysis',desc:'Understands why'},{key:'customerContext',label:'Context Awareness',desc:'Considers escalation reason'},{key:'escalationRecognition',label:'Escalation Understanding',desc:'Understands why escalated'}] : [{key:'correctIdentification',label:'Issue Identification',desc:'Accurately identifies problem'},{key:'rootCauseAnalysis',label:'Root Cause Analysis',desc:'Understands why'},{key:'customerContext',label:'Context Awareness',desc:'Considers history'},{key:'escalationRecognition',label:'Escalation Recognition',desc:'Identifies triggers'}];
  const processFields = isEscalationAgent ? [{key:'policyAccuracy',label:'Policy Accuracy',desc:'Correctly applies policies'},{key:'sopAdherence',label:'SOP Adherence',desc:'Follows procedures'},{key:'solutionCorrectness',label:'Solution Quality',desc:'Appropriate solutions'},{key:'escalationProcess',label:'Resolution Quality',desc:'Effectively resolves'}] : [{key:'policyAccuracy',label:'Policy Accuracy',desc:'Correctly applies policies'},{key:'sopAdherence',label:'SOP Adherence',desc:'Follows procedures'},{key:'solutionCorrectness',label:'Solution Quality',desc:'Appropriate solutions'},{key:'escalationProcess',label:'Escalation Process',desc:'Proper handling'}];
  const toolsFields = [{key:'gorgiasUsage',label:'Gorgias Usage',desc:'Uses helpdesk effectively'},{key:'internalNotes',label:'Internal Notes',desc:'Clear documentation'},{key:'shopifyUsage',label:'Shopify Usage',desc:'Actions verified in Shopify screenshots'}];

  const analytics = getAnalytics();

  return (
    <div style={{ minHeight: '100vh', color: '#e2e8f0', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px', padding: '32px', background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05))', borderRadius: '24px', border: '1px solid rgba(99,102,241,0.2)' }}>
          <h1 style={{ margin: '0 0 8px', fontSize: '28px', color: '#f1f5f9' }}>🤖 AI Ticket Grader</h1>
          <p style={{ margin: 0, color: '#64748b' }}>Multi-agent • Shopify screenshot analysis</p>
          <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#059669' }}>☁️ Cloud synced</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button onClick={() => { setActiveTab('grade'); setSelectedResult(null); }} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: activeTab === 'grade' ? '#6366f1' : 'rgba(255,255,255,0.05)', color: activeTab === 'grade' ? '#fff' : '#94a3b8', cursor: 'pointer', fontWeight: '600' }}>🤖 Grade</button>
          <button onClick={() => setActiveTab('history')} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: activeTab === 'history' ? '#6366f1' : 'rgba(255,255,255,0.05)', color: activeTab === 'history' ? '#fff' : '#94a3b8', cursor: 'pointer', fontWeight: '600' }}>📚 History ({savedResults.length})</button>
          <button onClick={() => setActiveTab('analytics')} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: activeTab === 'analytics' ? '#6366f1' : 'rgba(255,255,255,0.05)', color: activeTab === 'analytics' ? '#fff' : '#94a3b8', cursor: 'pointer', fontWeight: '600' }}>📊 Analytics</button>
          <button onClick={loadSavedResults} style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', marginLeft: 'auto' }}>🔄</button>
        </div>

        {activeTab === 'analytics' && (<div>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div><label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#64748b' }}>Date</label><select value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(30,30,40,0.9)', color: '#e2e8f0', cursor: 'pointer' }}><option value="all">All Time</option><option value="7days">7 Days</option><option value="30days">30 Days</option><option value="90days">90 Days</option><option value="custom">Custom</option></select></div>
              {dateFilter === 'custom' && <><div><label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#64748b' }}>Start</label><input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(30,30,40,0.9)', color: '#e2e8f0' }} /></div><div><label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#64748b' }}>End</label><input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(30,30,40,0.9)', color: '#e2e8f0' }} /></div></>}
              <div><label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#64748b' }}>Agent</label><select value={agentFilter} onChange={e => setAgentFilter(e.target.value)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(30,30,40,0.9)', color: '#e2e8f0', cursor: 'pointer' }}><option value="all">All</option>{uniqueAgents.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}><button onClick={exportCSV} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', cursor: 'pointer', fontSize: '13px' }}>📥 CSV</button><button onClick={exportJSON} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', cursor: 'pointer', fontSize: '13px' }}>📥 JSON</button></div>
          </div>
          {!analytics ? <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}><p style={{ color: '#64748b' }}>{isLoading ? '⏳ Loading...' : 'No data'}</p></div> : <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(99,102,241,0.2)' }}><div style={{ fontSize: '13px', color: '#a5b4fc', marginBottom: '8px' }}>Total</div><div style={{ fontSize: '36px', fontWeight: '700', color: '#f1f5f9' }}>{analytics.totalEvaluations}</div></div>
              <div style={{ background: `linear-gradient(135deg, ${getColor(analytics.avgScore)}22, ${getColor(analytics.avgScore)}11)`, borderRadius: '16px', padding: '24px', border: `1px solid ${getColor(analytics.avgScore)}33` }}><div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>Average</div><div style={{ fontSize: '36px', fontWeight: '700', color: getColor(analytics.avgScore) }}>{analytics.avgScore.toFixed(1)}%</div></div>
              <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(16,185,129,0.2)' }}><div style={{ fontSize: '13px', color: '#6ee7b7', marginBottom: '8px' }}>Passing</div><div style={{ fontSize: '36px', fontWeight: '700', color: '#10b981' }}>{analytics.passingRate.toFixed(0)}%</div></div>
              <div style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.15), rgba(220,38,38,0.05))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(220,38,38,0.2)' }}><div style={{ fontSize: '13px', color: '#fca5a5', marginBottom: '8px' }}>Violations</div><div style={{ fontSize: '36px', fontWeight: '700', color: '#dc2626' }}>{analytics.zeroToleranceCount}</div></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
              <div style={{ background: 'rgba(30,30,40,0.9)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)' }}><h3 style={{ margin: '0 0 20px', fontSize: '16px', color: '#f1f5f9' }}>📈 Categories</h3><ProgressBar value={analytics.categoryAvg.softSkills} color="#06b6d4" label="Soft Skills (20%)" /><ProgressBar value={analytics.categoryAvg.issueUnderstanding} color="#8b5cf6" label="Issue Understanding (30%)" /><ProgressBar value={analytics.categoryAvg.productProcess} color="#f59e0b" label="Product & Process (30%)" /><ProgressBar value={analytics.categoryAvg.toolsUtilization} color="#10b981" label="Tools (20%)" /></div>
              <div style={{ background: 'rgba(30,30,40,0.9)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)' }}><h3 style={{ margin: '0 0 20px', fontSize: '16px', color: '#f1f5f9' }}>🎯 Grades</h3><div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>{Object.entries(analytics.gradeDistribution).map(([g, c]) => <div key={g} style={{ textAlign: 'center', padding: '12px 8px', background: c > 0 ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)', borderRadius: '8px' }}><div style={{ fontSize: '18px', fontWeight: '700', color: c > 0 ? '#a5b4fc' : '#475569' }}>{g}</div><div style={{ fontSize: '24px', fontWeight: '700', color: c > 0 ? '#f1f5f9' : '#475569' }}>{c}</div></div>)}</div></div>
            </div>
            <div style={{ background: 'rgba(30,30,40,0.9)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px' }}><h3 style={{ margin: '0 0 20px', fontSize: '16px', color: '#f1f5f9' }}>🏆 Agent Ranking</h3><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}><th style={{ padding: '12px', textAlign: 'left', color: '#94a3b8', fontSize: '12px' }}>#</th><th style={{ padding: '12px', textAlign: 'left', color: '#94a3b8', fontSize: '12px' }}>Agent</th><th style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Avg</th><th style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Grade</th><th style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Count</th></tr></thead><tbody>{analytics.agentPerformance.map((a, i) => <tr key={a.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}><td style={{ padding: '12px', color: i < 3 ? '#fbbf24' : '#64748b', fontWeight: '700' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i+1}</td><td style={{ padding: '12px', color: '#e2e8f0' }}>{a.name}{a.isEscalation && <span style={{ marginLeft: '8px', background: '#f97316', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>ESC</span>}</td><td style={{ padding: '12px', textAlign: 'center', color: getColor(a.avgScore), fontWeight: '700' }}>{a.avgScore.toFixed(1)}%</td><td style={{ padding: '12px', textAlign: 'center' }}><span style={{ background: getColor(a.avgScore), color: '#fff', padding: '4px 12px', borderRadius: '6px', fontWeight: '700' }}>{a.grade}</span></td><td style={{ padding: '12px', textAlign: 'center', color: '#94a3b8' }}>{a.count}</td></tr>)}</tbody></table></div></div>
            <div style={{ background: 'rgba(30,30,40,0.9)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(139,92,246,0.2)' }}><h3 style={{ margin: '0 0 20px', fontSize: '16px', color: '#c4b5fd' }}>👤 Evaluator Activity</h3><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}><th style={{ padding: '12px', textAlign: 'left', color: '#94a3b8', fontSize: '12px' }}>Evaluator</th><th style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Evaluations</th><th style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Avg Score Given</th><th style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Avg Grade</th></tr></thead><tbody>{analytics.evaluatorPerformance.map((e) => <tr key={e.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}><td style={{ padding: '12px', color: '#e2e8f0', fontWeight: '600' }}>{e.name || 'Unknown'}</td><td style={{ padding: '12px', textAlign: 'center', color: '#c4b5fd', fontWeight: '700', fontSize: '18px' }}>{e.count}</td><td style={{ padding: '12px', textAlign: 'center', color: getColor(e.avgScore), fontWeight: '700' }}>{e.avgScore.toFixed(1)}%</td><td style={{ padding: '12px', textAlign: 'center' }}><span style={{ background: getColor(e.avgScore), color: '#fff', padding: '4px 12px', borderRadius: '6px', fontWeight: '700' }}>{e.grade}</span></td></tr>)}</tbody></table></div></div>
          </>}
        </div>)}

        {activeTab === 'history' && (<div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ flex: selectedResult ? '0 0 300px' : '1' }}>
            {savedResults.length > 0 && <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}><button onClick={exportCSV} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', cursor: 'pointer', fontSize: '12px' }}>📥 CSV</button><button onClick={exportJSON} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', cursor: 'pointer', fontSize: '12px' }}>📥 JSON</button></div>}
            {isLoading ? <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}><p style={{ color: '#64748b' }}>⏳ Loading...</p></div> : savedResults.length === 0 ? <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}><p style={{ color: '#64748b' }}>No results yet</p></div> : savedResults.map(r => (
              <div key={r.id} onClick={() => setSelectedResult(r)} style={{ background: selectedResult?.id === r.id ? 'rgba(99,102,241,0.15)' : 'rgba(30,30,40,0.9)', borderRadius: '12px', padding: '16px', marginBottom: '12px', border: selectedResult?.id === r.id ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><div><div style={{ fontWeight: '600', color: '#e2e8f0' }}>{r.agentName || 'Unknown'}{r.isEscalationAgent && <span style={{ marginLeft: '8px', background: '#f97316', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>ESC</span>}</div><div style={{ fontSize: '12px', color: '#64748b' }}>#{r.ticketId} • {r.evaluatorName} • {r.date}</div></div><div style={{ background: r.zeroToleranceViolation ? '#dc2626' : getColor(r.finalScore), color: '#fff', padding: '8px 12px', borderRadius: '8px', fontWeight: '700' }}>{r.grade}</div></div>
                <div style={{ marginTop: '8px', fontSize: '20px', fontWeight: '700', color: r.zeroToleranceViolation ? '#dc2626' : getColor(r.finalScore) }}>{r.finalScore.toFixed(1)}%</div>
              </div>
            ))}
          </div>
          {selectedResult && <div style={{ flex: 1, background: 'rgba(30,30,40,0.9)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}><div><h3 style={{ margin: 0, color: '#f1f5f9' }}>{selectedResult.agentName}{selectedResult.isEscalationAgent && <span style={{ marginLeft: '10px', background: '#f97316', padding: '4px 8px', borderRadius: '6px', fontSize: '12px' }}>ESC</span>}</h3><div style={{ color: '#64748b', fontSize: '14px' }}>#{selectedResult.ticketId} • {selectedResult.evaluatorName} • {selectedResult.date}</div></div><button onClick={() => deleteResult(selectedResult.id)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.1)', color: '#fca5a5', cursor: 'pointer' }}>🗑️</button></div>
            <div style={{ textAlign: 'center', padding: '20px', background: `${getColor(selectedResult.finalScore)}15`, borderRadius: '12px', marginBottom: '20px' }}><div style={{ fontSize: '48px', fontWeight: '700', color: selectedResult.zeroToleranceViolation ? '#dc2626' : getColor(selectedResult.finalScore) }}>{selectedResult.finalScore.toFixed(1)}%</div><div style={{ background: selectedResult.zeroToleranceViolation ? '#dc2626' : getColor(selectedResult.finalScore), color: '#fff', padding: '4px 16px', borderRadius: '6px', display: 'inline-block', marginTop: '8px', fontWeight: '700' }}>{selectedResult.grade}</div></div>
            {selectedResult.zeroToleranceViolation && <div style={{ background: 'rgba(220,38,38,0.15)', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid rgba(220,38,38,0.3)' }}><div style={{ color: '#fca5a5', fontWeight: '600' }}>🚫 Zero Tolerance Violation</div>{selectedResult.violationNotes && <div style={{ color: '#e2e8f0', marginTop: '8px' }}>{selectedResult.violationNotes}</div>}</div>}
            {!selectedResult.zeroToleranceViolation && <>
              {[{title:'Soft Skills',color:'#06b6d4',cat:'softSkills',fields:[{key:'tone',label:'Tone'},{key:'empathy',label:'Empathy'},{key:'professionalism',label:'Professionalism'},{key:'clarity',label:'Clarity'}]},{title:'Issue Understanding',color:'#8b5cf6',cat:'issueUnderstanding',fields:[{key:'correctIdentification',label:'Issue ID'},{key:'rootCauseAnalysis',label:'Root Cause'},{key:'customerContext',label:'Context'},{key:'escalationRecognition',label:'Escalation'}]},{title:'Product & Process',color:'#f59e0b',cat:'productProcess',fields:[{key:'policyAccuracy',label:'Policy'},{key:'sopAdherence',label:'SOP'},{key:'solutionCorrectness',label:'Solution'},{key:'escalationProcess',label:'Process'}]},{title:'Tools Utilization',color:'#10b981',cat:'toolsUtilization',fields:[{key:'gorgiasUsage',label:'Gorgias'},{key:'internalNotes',label:'Notes'},{key:'shopifyUsage',label:'Shopify'}]}].map(c => (
                <div key={c.cat} style={{ background: `${c.color}15`, borderRadius: '12px', padding: '16px', marginBottom: '16px', border: `1px solid ${c.color}33` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}><h4 style={{ margin: 0, color: c.color }}>{c.title}</h4><span style={{ color: c.color, fontWeight: '700' }}>{selectedResult.scores?.[c.cat]?.categoryScore?.toFixed(0) || 0}%</span></div>
                  {c.fields.map(f => (<div key={f.key} style={{ marginBottom: '10px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#e2e8f0', fontSize: '13px' }}>{f.label}</span><span style={{ color: c.color, fontWeight: '600' }}>{selectedResult.scores?.[c.cat]?.[f.key] || 0}/5</span></div>{selectedResult.scores?.[c.cat]?.explanations?.[f.key] && <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(99,102,241,0.1)', borderRadius: '6px', fontSize: '12px', color: '#a5b4fc' }}>🤖 {selectedResult.scores[c.cat].explanations[f.key]}</div>}</div>))}
                </div>
              ))}
            </>}
            {selectedResult.aiReasoning && <div style={{ marginBottom: '20px' }}><div style={{ color: '#94a3b8', marginBottom: '8px', fontWeight: '600' }}>🤖 AI Analysis</div><div style={{ background: 'rgba(99,102,241,0.1)', padding: '16px', borderRadius: '10px', color: '#e2e8f0' }}>{selectedResult.aiReasoning}</div></div>}
            {selectedResult.comments && <div style={{ marginBottom: '20px' }}><div style={{ color: '#94a3b8', marginBottom: '8px', fontWeight: '600' }}>💬 Feedback</div><div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '10px', color: '#e2e8f0' }}>{selectedResult.comments}</div></div>}
            {(selectedResult.shopifyNotes || selectedResult.shopifyScreenshots?.length > 0) && <div><div style={{ color: '#94a3b8', marginBottom: '8px', fontWeight: '600' }}>🛒 Shopify Data</div>{selectedResult.shopifyNotes && <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '10px', color: '#e2e8f0', marginBottom: '12px', whiteSpace: 'pre-wrap' }}>{selectedResult.shopifyNotes}</div>}{selectedResult.shopifyScreenshots?.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>{selectedResult.shopifyScreenshots.map((img, i) => <img key={i} src={img} alt={`Shopify ${i+1}`} style={{ maxWidth: '200px', maxHeight: '150px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }} onClick={() => window.open(img, '_blank')} />)}</div>}</div>}
          </div>}
        </div>)}

        {activeTab === 'grade' && <>
          <div style={{ background: 'rgba(30,30,40,0.9)', borderRadius: '20px', padding: '28px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '14px', color: '#94a3b8', textTransform: 'uppercase' }}>📋 Paste Ticket Conversation</h2>
            <textarea value={ticketContent} onChange={e => { setTicketContent(e.target.value); setAnalysisComplete(false); }} placeholder="Paste full ticket conversation here..." style={{ width: '100%', height: '200px', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '14px', resize: 'vertical' }} />
          </div>

          <div style={{ background: 'rgba(30,30,40,0.9)', borderRadius: '20px', padding: '28px', marginBottom: '24px', border: '1px solid rgba(16,185,129,0.2)' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: '14px', color: '#10b981', textTransform: 'uppercase' }}>🛒 Shopify Data (for AI analysis)</h2>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#64748b' }}>Paste Shopify order details and screenshots. AI will analyze them to verify agent actions (refunds, holds, cancellations).</p>
            <textarea value={shopifyNotes} onChange={e => setShopifyNotes(e.target.value)} onPaste={handleShopifyPaste} placeholder="Paste Shopify order details here (order number, customer info, timeline, etc.)&#10;&#10;You can also paste screenshots directly (Ctrl+V)" style={{ width: '100%', height: '100px', padding: '16px', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '14px', resize: 'vertical' }} />
            {shopifyScreenshots.length > 0 && <div style={{ marginTop: '16px' }}><div style={{ fontSize: '12px', color: '#10b981', marginBottom: '8px' }}>📸 Screenshots to analyze ({shopifyScreenshots.length})</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>{shopifyScreenshots.map((img, i) => <div key={i} style={{ position: 'relative' }}><img src={img} alt={`Screenshot ${i+1}`} style={{ maxWidth: '150px', maxHeight: '100px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)' }} /><button onClick={() => removeScreenshot(i)} style={{ position: 'absolute', top: '-8px', right: '-8px', width: '24px', height: '24px', borderRadius: '50%', border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontSize: '14px' }}>×</button></div>)}</div></div>}
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <button onClick={analyzeTicket} disabled={!ticketContent.trim() || isAnalyzing} style={{ padding: '14px 28px', borderRadius: '10px', border: 'none', background: !ticketContent.trim() || isAnalyzing ? 'rgba(99,102,241,0.3)' : '#6366f1', color: '#fff', cursor: !ticketContent.trim() || isAnalyzing ? 'not-allowed' : 'pointer', fontWeight: '600', flex: 1 }}>{isAnalyzing ? '⏳ Analyzing ticket & Shopify screenshots...' : `🤖 Analyze with AI${shopifyScreenshots.length > 0 ? ` (+ ${shopifyScreenshots.length} screenshots)` : ''}`}</button>
            <button onClick={startManualMode} disabled={!ticketContent.trim()} style={{ padding: '14px 28px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#94a3b8', cursor: !ticketContent.trim() ? 'not-allowed' : 'pointer', fontWeight: '600' }}>✏️ Manual</button>
          </div>

          {analysisComplete && <>
            {agentEvaluations.length > 0 && <div style={{ background: 'rgba(139,92,246,0.1)', borderRadius: '16px', padding: '20px', marginBottom: '24px', border: '1px solid rgba(139,92,246,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}><h3 style={{ margin: 0, fontSize: '14px', color: '#c4b5fd', textTransform: 'uppercase' }}>👥 Agents ({agentEvaluations.length})</h3><button onClick={addNewAgent} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.2)', color: '#c4b5fd', cursor: 'pointer', fontSize: '13px' }}>+ Add</button></div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{agentEvaluations.map((a, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><button onClick={() => switchAgent(i)} style={{ padding: '10px 16px', borderRadius: '8px', border: currentAgentIndex === i ? '2px solid #8b5cf6' : '1px solid rgba(255,255,255,0.1)', background: currentAgentIndex === i ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.05)', color: currentAgentIndex === i ? '#fff' : '#94a3b8', cursor: 'pointer', fontWeight: '600' }}>{a.agentName || `Agent ${i+1}`}</button>{agentEvaluations.length > 1 && <button onClick={() => removeAgent(i)} style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: 'rgba(220,38,38,0.2)', color: '#fca5a5', cursor: 'pointer', fontSize: '12px' }}>✕</button>}</div>)}</div>
            </div>}

            <div style={{ background: 'rgba(99,102,241,0.1)', borderRadius: '16px', padding: '20px', marginBottom: '24px', border: '1px solid rgba(99,102,241,0.2)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '14px', color: '#a5b4fc', textTransform: 'uppercase' }}>Ticket Info</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div><label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#64748b' }}>Agent Name *</label><input value={agentName} onChange={e => setAgentName(e.target.value)} placeholder="Agent name" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }} /></div>
                <div><label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#64748b' }}>Ticket ID</label><input value={ticketId} onChange={e => setTicketId(e.target.value)} placeholder="12345" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }} /></div>
                <div><label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#64748b' }}>Ticket Link</label><input value={ticketLink} onChange={e => setTicketLink(e.target.value)} placeholder="https://..." style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }} /></div>
                <div><label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#64748b' }}>Evaluator *</label><select value={evaluatorName} onChange={e => setEvaluatorName(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', cursor: 'pointer' }}><option value="">Select...</option>{evaluators.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
              </div>
              {isEscalationAgent && <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(249,115,22,0.15)', borderRadius: '10px', border: '1px solid rgba(249,115,22,0.3)' }}><span style={{ color: '#fb923c', fontWeight: '600' }}>🔶 Escalation Agent</span></div>}
            </div>

            {aiReasoning && <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}><div style={{ color: '#a5b4fc', fontWeight: '600', marginBottom: '12px' }}>🤖 AI Analysis</div><div style={{ color: '#e2e8f0', lineHeight: '1.7' }}>{aiReasoning}</div></div>}

            {detectedBuzzwords.length > 0 && !isEscalationAgent && <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(220,38,38,0.1)', borderRadius: '12px', border: '1px solid rgba(220,38,38,0.3)' }}><div style={{ fontWeight: '600', color: '#fca5a5', marginBottom: '12px' }}>🚨 BUZZWORDS</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>{detectedBuzzwords.map((t,i) => <span key={i} style={{ background: 'rgba(220,38,38,0.3)', color: '#fca5a5', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>{t}</span>)}</div></div>}

            {!isEscalationAgent && detectedBuzzwords.length > 0 && <div style={{ background: zeroToleranceViolation ? 'rgba(220,38,38,0.15)' : 'rgba(30,30,40,0.9)', borderRadius: '20px', padding: '28px', marginBottom: '24px', border: zeroToleranceViolation ? '2px solid rgba(220,38,38,0.5)' : '1px solid rgba(255,255,255,0.08)' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><h3 style={{ margin: 0, color: zeroToleranceViolation ? '#fca5a5' : '#f1f5f9' }}>🚫 Zero Tolerance Check</h3></div><button onClick={() => setZeroToleranceViolation(!zeroToleranceViolation)} style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', background: zeroToleranceViolation ? '#dc2626' : 'rgba(255,255,255,0.08)', color: zeroToleranceViolation ? '#fff' : '#94a3b8', cursor: 'pointer', fontWeight: '600' }}>{zeroToleranceViolation ? '✓ VIOLATION' : 'Flag'}</button></div>{zeroToleranceViolation && <textarea value={violationNotes} onChange={e => setViolationNotes(e.target.value)} placeholder="Describe violation..." style={{ width: '100%', marginTop: '16px', padding: '14px', borderRadius: '10px', border: '1px solid rgba(220,38,38,0.3)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', height: '80px' }} />}</div>}

            {!zeroToleranceViolation && <>
              <Category title="Soft Skills" weight={20} scores={softSkills} setScores={setSoftSkills} explanations={softSkillsExp} color="#06b6d4" fields={[{key:'tone',label:'Tone',desc:'Appropriate language'},{key:'empathy',label:'Empathy',desc:'Shows care'},{key:'professionalism',label:'Professionalism',desc:'Composure'},{key:'clarity',label:'Clarity',desc:'Clear communication'}]} />
              <Category title="Issue Understanding" weight={30} scores={issueUnderstanding} setScores={setIssueUnderstanding} explanations={issueUnderstandingExp} color="#8b5cf6" fields={issueFields} />
              <Category title="Product & Process" weight={30} scores={productProcess} setScores={setProductProcess} explanations={productProcessExp} color="#f59e0b" fields={processFields} />
              <Category title="Tools Utilization" weight={20} scores={toolsUtilization} setScores={setToolsUtilization} explanations={toolsUtilizationExp} color="#10b981" fields={toolsFields} />
            </>}

            <div style={{ background: 'rgba(30,30,40,0.9)', borderRadius: '20px', padding: '28px', marginBottom: '24px' }}><h3 style={{ margin: '0 0 16px', fontSize: '14px', color: '#94a3b8', textTransform: 'uppercase' }}>Feedback</h3><textarea value={comments} onChange={e => setComments(e.target.value)} placeholder="Coaching notes..." style={{ width: '100%', height: '100px', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }} /></div>

            <div style={{ background: zeroToleranceViolation ? 'rgba(220,38,38,0.15)' : `${getColor(finalScore)}15`, borderRadius: '24px', padding: '32px', marginBottom: '24px', border: `2px solid ${zeroToleranceViolation ? 'rgba(220,38,38,0.4)' : getColor(finalScore)}44`, textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>Final Score</div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '24px', marginBottom: '24px' }}>
                <div style={{ fontSize: '64px', fontWeight: '700', color: zeroToleranceViolation ? '#dc2626' : getColor(finalScore) }}>{finalScore.toFixed(1)}%</div>
                <div style={{ width: '70px', height: '70px', borderRadius: '16px', background: zeroToleranceViolation ? '#dc2626' : getColor(finalScore), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '700', color: '#fff' }}>{zeroToleranceViolation ? 'F' : getGrade(finalScore)}</div>
              </div>
              {!zeroToleranceViolation && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>{[{l:'Soft',s:calcScore(softSkills),c:'#06b6d4'},{l:'Issue',s:calcScore(issueUnderstanding),c:'#8b5cf6'},{l:'Process',s:calcScore(productProcess),c:'#f59e0b'},{l:'Tools',s:calcScore(toolsUtilization),c:'#10b981'}].map((x,i) => <div key={i} style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '10px' }}><div style={{ fontSize: '10px', color: '#64748b' }}>{x.l}</div><div style={{ fontSize: '20px', fontWeight: '700', color: x.c }}>{x.s.toFixed(0)}%</div></div>)}</div>}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button onClick={saveResult} style={{ padding: '16px 32px', borderRadius: '12px', border: 'none', background: '#059669', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>💾 Save{agentEvaluations.length > 1 ? ` All (${agentEvaluations.length})` : ''}</button>
                <button onClick={resetForm} style={{ padding: '16px 32px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: '600' }}>🔄 Reset</button>
              </div>
              {saveStatus && <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', background: saveStatus === 'saved' ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)', color: saveStatus === 'saved' ? '#6ee7b7' : '#fca5a5' }}>{saveStatus === 'saved' ? '✓ Saved!' : '✗ Error'}</div>}
            </div>
          </>}
        </>}
      </div>
    </div>
  );
}
