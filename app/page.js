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
  
  // Coaching tab state
  const [coachingDateFilter, setCoachingDateFilter] = useState('30days');
  const [coachingAgentFilter, setCoachingAgentFilter] = useState('all');
  const [selectedCoachingAgent, setSelectedCoachingAgent] = useState(null);
  
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
    
    const content = [];
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

${shopifyScreenshots.length > 0 ? `IMPORTANT: ${shopifyScreenshots.length} Shopify screenshot(s) are attached. Analyze them to verify agent actions.` : ''}

Respond ONLY with JSON:
{"ticketId":"extracted ID","agents":[{"agentName":"Name","isEscalationAgent":false,"zeroToleranceViolation":false,"violationNotes":"","scores":{"softSkills":{"tone":{"score":1-5,"explanation":"why"},"empathy":{"score":1-5,"explanation":"why"},"professionalism":{"score":1-5,"explanation":"why"},"clarity":{"score":1-5,"explanation":"why"}},"issueUnderstanding":{"correctIdentification":{"score":1-5,"explanation":"why"},"rootCauseAnalysis":{"score":1-5,"explanation":"why"},"customerContext":{"score":1-5,"explanation":"why"},"escalationRecognition":{"score":1-5,"explanation":"why"}},"productProcess":{"policyAccuracy":{"score":1-5,"explanation":"why"},"sopAdherence":{"score":1-5,"explanation":"why"},"solutionCorrectness":{"score":1-5,"explanation":"why"},"escalationProcess":{"score":1-5,"explanation":"why"}},"toolsUtilization":{"gorgiasUsage":{"score":1-5,"explanation":"why"},"internalNotes":{"score":1-5,"explanation":"why"},"shopifyUsage":{"score":1-5,"explanation":"why"}}},"overallAnalysis":"analysis","suggestedFeedback":"coaching"}]}`;

    content.push({ type: 'text', text: textPrompt });
    
    for (const screenshot of shopifyScreenshots) {
      content.push({ type: 'image', source: { type: 'base64', media_type: screenshot.split(';')[0].split(':')[1], data: screenshot.split(',')[1] } });
    }

    try {
      const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, hasImages: shopifyScreenshots.length > 0 }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
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
          aiReasoning: agent.overallAnalysis || '', comments: agent.suggestedFeedback || ''
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
    filtered.forEach(r => { if (!evaluatorStats[r.evaluatorName]) evaluatorStats[r.evaluatorName] = { name: r.evaluatorName, count: 0, totalScore: 0 }; evaluatorStats[r.evaluatorName].count += 1; evaluatorStats[r.evaluatorName].totalScore += r.finalScore; });
    const evaluatorPerformance = Object.values(evaluatorStats).map(e => ({ ...e, avgScore: e.totalScore / e.count, grade: getGrade(e.totalScore / e.count) })).sort((a, b) => b.count - a.count);
    return { totalEvaluations: total, avgScore, zeroToleranceCount: zeroCount, gradeDistribution, categoryAvg, agentPerformance, evaluatorPerformance, passingRate: (filtered.filter(r => r.finalScore >= 70).length / total * 100) };
  };

  // Coaching Analysis Function
  const getCoachingAnalysis = () => {
    let filtered = [...savedResults];
    if (coachingDateFilter !== 'all') {
      const now = new Date(); const filterDate = new Date();
      if (coachingDateFilter === '7days') filterDate.setDate(now.getDate() - 7);
      else if (coachingDateFilter === '30days') filterDate.setDate(now.getDate() - 30);
      else if (coachingDateFilter === '90days') filterDate.setDate(now.getDate() - 90);
      filtered = filtered.filter(r => new Date(r.timestamp) >= filterDate);
    }
    if (coachingAgentFilter !== 'all') filtered = filtered.filter(r => r.agentName === coachingAgentFilter);
    if (filtered.length === 0) return null;

    const agentData = {};
    filtered.forEach(r => {
      if (!agentData[r.agentName]) {
        agentData[r.agentName] = { name: r.agentName, evaluations: [], totalScore: 0, count: 0, violations: 0,
          categories: {
            softSkills: { scores: [], subScores: { tone: [], empathy: [], professionalism: [], clarity: [] } },
            issueUnderstanding: { scores: [], subScores: { correctIdentification: [], rootCauseAnalysis: [], customerContext: [], escalationRecognition: [] } },
            productProcess: { scores: [], subScores: { policyAccuracy: [], sopAdherence: [], solutionCorrectness: [], escalationProcess: [] } },
            toolsUtilization: { scores: [], subScores: { gorgiasUsage: [], internalNotes: [], shopifyUsage: [] } }
          }, feedbacks: []
        };
      }
      const a = agentData[r.agentName];
      a.evaluations.push(r); a.totalScore += r.finalScore; a.count++;
      if (r.zeroToleranceViolation) a.violations++;
      if (r.scores?.softSkills?.categoryScore) a.categories.softSkills.scores.push(r.scores.softSkills.categoryScore);
      if (r.scores?.issueUnderstanding?.categoryScore) a.categories.issueUnderstanding.scores.push(r.scores.issueUnderstanding.categoryScore);
      if (r.scores?.productProcess?.categoryScore) a.categories.productProcess.scores.push(r.scores.productProcess.categoryScore);
      if (r.scores?.toolsUtilization?.categoryScore) a.categories.toolsUtilization.scores.push(r.scores.toolsUtilization.categoryScore);
      ['tone', 'empathy', 'professionalism', 'clarity'].forEach(k => { if (r.scores?.softSkills?.[k]) a.categories.softSkills.subScores[k].push(r.scores.softSkills[k]); });
      ['correctIdentification', 'rootCauseAnalysis', 'customerContext', 'escalationRecognition'].forEach(k => { if (r.scores?.issueUnderstanding?.[k]) a.categories.issueUnderstanding.subScores[k].push(r.scores.issueUnderstanding[k]); });
      ['policyAccuracy', 'sopAdherence', 'solutionCorrectness', 'escalationProcess'].forEach(k => { if (r.scores?.productProcess?.[k]) a.categories.productProcess.subScores[k].push(r.scores.productProcess[k]); });
      ['gorgiasUsage', 'internalNotes', 'shopifyUsage'].forEach(k => { if (r.scores?.toolsUtilization?.[k]) a.categories.toolsUtilization.subScores[k].push(r.scores.toolsUtilization[k]); });
      if (r.comments) a.feedbacks.push({ date: r.date, feedback: r.comments, score: r.finalScore, ticketId: r.ticketId });
    });

    const agents = Object.values(agentData).map(a => {
      const avgScore = a.totalScore / a.count;
      const catAvg = {
        softSkills: a.categories.softSkills.scores.length ? a.categories.softSkills.scores.reduce((x, y) => x + y, 0) / a.categories.softSkills.scores.length : 0,
        issueUnderstanding: a.categories.issueUnderstanding.scores.length ? a.categories.issueUnderstanding.scores.reduce((x, y) => x + y, 0) / a.categories.issueUnderstanding.scores.length : 0,
        productProcess: a.categories.productProcess.scores.length ? a.categories.productProcess.scores.reduce((x, y) => x + y, 0) / a.categories.productProcess.scores.length : 0,
        toolsUtilization: a.categories.toolsUtilization.scores.length ? a.categories.toolsUtilization.scores.reduce((x, y) => x + y, 0) / a.categories.toolsUtilization.scores.length : 0
      };
      const subAvg = {};
      Object.entries(a.categories).forEach(([cat, data]) => { subAvg[cat] = {}; Object.entries(data.subScores).forEach(([sub, vals]) => { subAvg[cat][sub] = vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : 0; }); });
      const allSubs = [];
      Object.entries(subAvg).forEach(([cat, subs]) => { Object.entries(subs).forEach(([sub, val]) => { allSubs.push({ category: cat, skill: sub, score: val }); }); });
      allSubs.sort((x, y) => x.score - y.score);
      const weaknesses = allSubs.slice(0, 3).filter(s => s.score < 4);
      const strengths = allSubs.slice(-3).reverse().filter(s => s.score >= 4);
      const recentEvals = a.evaluations.sort((x, y) => new Date(y.timestamp) - new Date(x.timestamp)).slice(0, 5);
      const trend = recentEvals.length >= 2 ? (recentEvals[0].finalScore - recentEvals[recentEvals.length - 1].finalScore) : 0;
      let priority = 'low';
      if (avgScore < 70 || a.violations > 0) priority = 'high';
      else if (avgScore < 80 || weaknesses.length >= 2) priority = 'medium';
      return { ...a, avgScore, grade: getGrade(avgScore), catAvg, subAvg, weaknesses, strengths, trend, priority, recentEvals, feedbacks: a.feedbacks.sort((x, y) => new Date(y.date) - new Date(x.date)).slice(0, 5) };
    });

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    agents.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || a.avgScore - b.avgScore);
    const needsCoaching = agents.filter(a => a.priority === 'high' || a.priority === 'medium');
    const topPerformers = agents.filter(a => a.avgScore >= 85).sort((a, b) => b.avgScore - a.avgScore).slice(0, 5);
    return { agents, needsCoaching, topPerformers, totalAgents: agents.length, totalEvaluations: filtered.length };
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
  const coaching = getCoachingAnalysis();

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
          <button onClick={() => setActiveTab('coaching')} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: activeTab === 'coaching' ? '#6366f1' : 'rgba(255,255,255,0.05)', color: activeTab === 'coaching' ? '#fff' : '#94a3b8', cursor: 'pointer', fontWeight: '600' }}>🎓 Coaching</button>
          <button onClick={loadSavedResults} style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', marginLeft: 'auto' }}>🔄</button>
        </div>

        {/* COACHING TAB */}
        {activeTab === 'coaching' && (<div>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div><label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#64748b' }}>Time Period</label><select value={coachingDateFilter} onChange={e => { setCoachingDateFilter(e.target.value); setSelectedCoachingAgent(null); }} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(30,30,40,0.9)', color: '#e2e8f0', cursor: 'pointer' }}><option value="7days">Last 7 Days</option><option value="30days">Last 30 Days</option><option value="90days">Last 90 Days</option><option value="all">All Time</option></select></div>
            <div><label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#64748b' }}>Agent</label><select value={coachingAgentFilter} onChange={e => { setCoachingAgentFilter(e.target.value); setSelectedCoachingAgent(null); }} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(30,30,40,0.9)', color: '#e2e8f0', cursor: 'pointer' }}><option value="all">All Agents</option>{uniqueAgents.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
            {coaching && <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#64748b' }}>Analyzing <strong style={{ color: '#a5b4fc' }}>{coaching.totalAgents}</strong> agents • <strong style={{ color: '#a5b4fc' }}>{coaching.totalEvaluations}</strong> evaluations</div>}
          </div>

          {!coaching ? <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}><p style={{ color: '#64748b' }}>{isLoading ? '⏳ Loading...' : 'No data for coaching analysis'}</p></div> : <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.15), rgba(220,38,38,0.05))', borderRadius: '16px', padding: '20px', border: '1px solid rgba(220,38,38,0.2)' }}><div style={{ fontSize: '12px', color: '#fca5a5', marginBottom: '6px' }}>🎯 Needs Coaching</div><div style={{ fontSize: '32px', fontWeight: '700', color: '#dc2626' }}>{coaching.needsCoaching.length}</div><div style={{ fontSize: '11px', color: '#64748b' }}>High/Medium Priority</div></div>
              <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))', borderRadius: '16px', padding: '20px', border: '1px solid rgba(16,185,129,0.2)' }}><div style={{ fontSize: '12px', color: '#6ee7b7', marginBottom: '6px' }}>⭐ Top Performers</div><div style={{ fontSize: '32px', fontWeight: '700', color: '#10b981' }}>{coaching.topPerformers.length}</div><div style={{ fontSize: '11px', color: '#64748b' }}>Score ≥ 85%</div></div>
              <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05))', borderRadius: '16px', padding: '20px', border: '1px solid rgba(99,102,241,0.2)' }}><div style={{ fontSize: '12px', color: '#a5b4fc', marginBottom: '6px' }}>👥 Total Agents</div><div style={{ fontSize: '32px', fontWeight: '700', color: '#6366f1' }}>{coaching.totalAgents}</div><div style={{ fontSize: '11px', color: '#64748b' }}>With evaluations</div></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: selectedCoachingAgent ? '1fr 1fr' : '1fr', gap: '20px' }}>
              <div>
                {coaching.needsCoaching.length > 0 && <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#fca5a5' }}>🚨 Needs Coaching ({coaching.needsCoaching.length})</h3>
                  {coaching.needsCoaching.map(agent => (
                    <div key={agent.name} onClick={() => setSelectedCoachingAgent(agent)} style={{ background: selectedCoachingAgent?.name === agent.name ? 'rgba(99,102,241,0.15)' : 'rgba(30,30,40,0.9)', borderRadius: '12px', padding: '16px', marginBottom: '12px', border: selectedCoachingAgent?.name === agent.name ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: `${getColor(agent.avgScore)}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: getColor(agent.avgScore) }}>{agent.grade}</div>
                          <div><div style={{ fontWeight: '600', color: '#e2e8f0' }}>{agent.name}</div><div style={{ fontSize: '12px', color: '#64748b' }}>{agent.count} evaluations</div></div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '20px', fontWeight: '700', color: getColor(agent.avgScore) }}>{agent.avgScore.toFixed(1)}%</div>
                          <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600', background: agent.priority === 'high' ? 'rgba(220,38,38,0.2)' : 'rgba(245,158,11,0.2)', color: agent.priority === 'high' ? '#fca5a5' : '#fbbf24' }}>{agent.priority.toUpperCase()}</span>
                        </div>
                      </div>
                      {agent.weaknesses.length > 0 && <div><div style={{ fontSize: '10px', color: '#64748b', marginBottom: '6px' }}>AREAS TO IMPROVE</div><div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>{agent.weaknesses.map((w, i) => <span key={i} style={{ padding: '4px 8px', background: 'rgba(220,38,38,0.15)', borderRadius: '6px', fontSize: '11px', color: '#fca5a5' }}>{w.skill.replace(/([A-Z])/g, ' $1').trim()}: {w.score.toFixed(1)}/5</span>)}</div></div>}
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ fontSize: '11px', color: '#64748b' }}>Trend:</span><span style={{ fontSize: '12px', fontWeight: '600', color: agent.trend > 0 ? '#10b981' : agent.trend < 0 ? '#dc2626' : '#64748b' }}>{agent.trend > 0 ? '↑' : agent.trend < 0 ? '↓' : '→'} {Math.abs(agent.trend).toFixed(1)}%</span></div>
                    </div>
                  ))}
                </div>}

                {coaching.topPerformers.length > 0 && <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#6ee7b7' }}>🌟 Top Performers ({coaching.topPerformers.length})</h3>
                  {coaching.topPerformers.map(agent => (
                    <div key={agent.name} onClick={() => setSelectedCoachingAgent(agent)} style={{ background: selectedCoachingAgent?.name === agent.name ? 'rgba(99,102,241,0.15)' : 'rgba(30,30,40,0.9)', borderRadius: '12px', padding: '16px', marginBottom: '12px', border: selectedCoachingAgent?.name === agent.name ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: `${getColor(agent.avgScore)}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: getColor(agent.avgScore) }}>{agent.grade}</div>
                          <div><div style={{ fontWeight: '600', color: '#e2e8f0' }}>{agent.name}</div><div style={{ fontSize: '12px', color: '#64748b' }}>{agent.count} evaluations</div></div>
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: getColor(agent.avgScore) }}>{agent.avgScore.toFixed(1)}%</div>
                      </div>
                      {agent.strengths.length > 0 && <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>{agent.strengths.map((s, i) => <span key={i} style={{ padding: '4px 8px', background: 'rgba(16,185,129,0.15)', borderRadius: '6px', fontSize: '11px', color: '#6ee7b7' }}>{s.skill.replace(/([A-Z])/g, ' $1').trim()}: {s.score.toFixed(1)}/5</span>)}</div>}
                    </div>
                  ))}
                </div>}

                {coaching.agents.filter(a => a.priority === 'low' && a.avgScore < 85).length > 0 && <div>
                  <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#94a3b8' }}>📊 Other Agents</h3>
                  {coaching.agents.filter(a => a.priority === 'low' && a.avgScore < 85).map(agent => (
                    <div key={agent.name} onClick={() => setSelectedCoachingAgent(agent)} style={{ background: selectedCoachingAgent?.name === agent.name ? 'rgba(99,102,241,0.15)' : 'rgba(30,30,40,0.9)', borderRadius: '10px', padding: '14px', marginBottom: '10px', border: selectedCoachingAgent?.name === agent.name ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${getColor(agent.avgScore)}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: getColor(agent.avgScore) }}>{agent.grade}</div>
                          <div><div style={{ fontWeight: '600', color: '#e2e8f0', fontSize: '14px' }}>{agent.name}</div><div style={{ fontSize: '11px', color: '#64748b' }}>{agent.count} evals</div></div>
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: getColor(agent.avgScore) }}>{agent.avgScore.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>}
              </div>

              {selectedCoachingAgent && <div style={{ background: 'rgba(30,30,40,0.9)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)', position: 'sticky', top: '20px', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div><h3 style={{ margin: '0 0 4px', fontSize: '20px', color: '#f1f5f9' }}>{selectedCoachingAgent.name}</h3><div style={{ fontSize: '13px', color: '#64748b' }}>{selectedCoachingAgent.count} evaluations</div></div>
                  <button onClick={() => setSelectedCoachingAgent(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '20px' }}>×</button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '14px', background: `${getColor(selectedCoachingAgent.avgScore)}22`, border: `2px solid ${getColor(selectedCoachingAgent.avgScore)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '700', color: getColor(selectedCoachingAgent.avgScore) }}>{selectedCoachingAgent.grade}</div>
                  <div><div style={{ fontSize: '28px', fontWeight: '700', color: getColor(selectedCoachingAgent.avgScore) }}>{selectedCoachingAgent.avgScore.toFixed(1)}%</div><div style={{ fontSize: '12px', color: '#64748b' }}>Average Score</div></div>
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: selectedCoachingAgent.trend > 0 ? '#10b981' : selectedCoachingAgent.trend < 0 ? '#dc2626' : '#64748b' }}>{selectedCoachingAgent.trend > 0 ? '↑' : selectedCoachingAgent.trend < 0 ? '↓' : '→'} {Math.abs(selectedCoachingAgent.trend).toFixed(1)}%</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Recent Trend</div>
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#f1f5f9' }}>📊 Category Performance</h4>
                  {[{ k: 'softSkills', l: 'Soft Skills', c: '#06b6d4' }, { k: 'issueUnderstanding', l: 'Issue Understanding', c: '#8b5cf6' }, { k: 'productProcess', l: 'Product & Process', c: '#f59e0b' }, { k: 'toolsUtilization', l: 'Tools Utilization', c: '#10b981' }].map(cat => (
                    <div key={cat.k} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span style={{ fontSize: '12px', color: '#94a3b8' }}>{cat.l}</span><span style={{ fontSize: '12px', fontWeight: '700', color: cat.c }}>{selectedCoachingAgent.catAvg[cat.k].toFixed(0)}%</span></div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.min(selectedCoachingAgent.catAvg[cat.k], 100)}%`, background: cat.c, borderRadius: '3px' }}></div></div>
                    </div>
                  ))}
                </div>

                {selectedCoachingAgent.weaknesses.length > 0 && <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(220,38,38,0.08)', borderRadius: '12px', borderLeft: '3px solid #dc2626' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#fca5a5' }}>🎯 Coaching Focus Areas</h4>
                  {selectedCoachingAgent.weaknesses.map((w, i) => (
                    <div key={i} style={{ marginBottom: '8px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span style={{ fontSize: '13px', color: '#e2e8f0' }}>{w.skill.replace(/([A-Z])/g, ' $1').trim()}</span><span style={{ fontSize: '13px', fontWeight: '700', color: '#dc2626' }}>{w.score.toFixed(1)}/5</span></div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Category: {w.category.replace(/([A-Z])/g, ' $1').trim()}</div>
                    </div>
                  ))}
                </div>}

                {selectedCoachingAgent.strengths.length > 0 && <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(16,185,129,0.08)', borderRadius: '12px', borderLeft: '3px solid #10b981' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#6ee7b7' }}>💪 Strengths</h4>
                  {selectedCoachingAgent.strengths.map((s, i) => (
                    <div key={i} style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#e2e8f0' }}>{s.skill.replace(/([A-Z])/g, ' $1').trim()}</span><span style={{ fontSize: '13px', fontWeight: '700', color: '#10b981' }}>{s.score.toFixed(1)}/5</span>
                    </div>
                  ))}
                </div>}

                {selectedCoachingAgent.feedbacks.length > 0 && <div>
                  <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#f1f5f9' }}>💬 Recent Feedback</h4>
                  {selectedCoachingAgent.feedbacks.map((fb, i) => (
                    <div key={i} style={{ marginBottom: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', borderLeft: `3px solid ${getColor(fb.score)}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}><span style={{ fontSize: '11px', color: '#64748b' }}>{fb.date}</span><span style={{ fontSize: '12px', fontWeight: '700', color: getColor(fb.score) }}>{fb.score.toFixed(0)}%</span></div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>{fb.feedback}</div>
                      {fb.ticketId && <a href={`https://osmozone.gorgias.com/app/ticket/${fb.ticketId}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#a5b4fc', marginTop: '6px', display: 'inline-block' }}>View Ticket →</a>}
                    </div>
                  ))}
                </div>}

                {selectedCoachingAgent.violations > 0 && <div style={{ marginTop: '20px', padding: '14px', background: 'rgba(220,38,38,0.15)', borderRadius: '10px', border: '1px solid rgba(220,38,38,0.3)' }}>
                  <div style={{ fontSize: '13px', color: '#fca5a5', fontWeight: '600' }}>⚠️ {selectedCoachingAgent.violations} Zero Tolerance Violation(s)</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Requires immediate attention</div>
                </div>}
              </div>}
            </div>
          </>}
        </div>)}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (<div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ flex: selectedResult ? '0 0 300px' : '1' }}>
            {savedResults.length > 0 && <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}><button onClick={exportCSV} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', cursor: 'pointer', fontSize: '12px' }}>📥 CSV</button><button onClick={exportJSON} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', cursor: 'pointer', fontSize: '12px' }}>📥 JSON</button></div>}
            {isLoading ? <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}><p style={{ color: '#64748b' }}>⏳ Loading...</p></div> : savedResults.length === 0 ? <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}><p style={{ color: '#64748b' }}>No results yet</p></div> : savedResults.map(r => (
              <div key={r.id} onClick={() => setSelectedResult(r)} style={{ background: selectedResult?.id === r.id ? 'rgba(99,102,241,0.15)' : 'rgba(30,30,40,0.9)', borderRadius: '12px', padding: '16px', marginBottom: '12px', border: selectedResult?.id === r.id ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div><div style={{ fontWeight: '600', color: '#e2e8f0' }}>{r.agentName || 'Unknown'}{r.isEscalationAgent && <span style={{ marginLeft: '8px', background: '#f97316', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>ESC</span>}</div><div style={{ fontSize: '12px', color: '#64748b' }}>#{r.ticketId} • {r.evaluatorName} • {r.date}</div></div>
                  <div style={{ background: r.zeroToleranceViolation ? '#dc2626' : getColor(r.finalScore), color: '#fff', padding: '8px 12px', borderRadius: '8px', fontWeight: '700' }}>{r.grade}</div>
                </div>
                <div style={{ marginTop: '8px', fontSize: '20px', fontWeight: '700', color: r.zeroToleranceViolation ? '#dc2626' : getColor(r.finalScore) }}>{r.finalScore.toFixed(1)}%</div>
              </div>
            ))}
          </div>
          {selectedResult && (<div style={{ flex: 1, background: 'rgba(30,30,40,0.9)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div><h3 style={{ margin: 0, color: '#f1f5f9' }}>{selectedResult.agentName}{selectedResult.isEscalationAgent && <span style={{ marginLeft: '10px', background: '#f97316', padding: '4px 8px', borderRadius: '6px', fontSize: '12px' }}>ESC</span>}</h3><div style={{ color: '#64748b', fontSize: '14px' }}>#{selectedResult.ticketId} • {selectedResult.evaluatorName} • {selectedResult.date}</div></div>
              <button onClick={() => deleteResult(selectedResult.id)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.1)', color: '#fca5a5', cursor: 'pointer' }}>🗑️</button>
            </div>
            <div style={{ textAlign: 'center', padding: '20px', background: `${getColor(selectedResult.finalScore)}15`, borderRadius: '12px', marginBottom: '20px' }}>
              <div style={{ fontSize: '48px', fontWeight: '700', color: selectedResult.zeroToleranceViolation ? '#dc2626' : getColor(selectedResult.finalScore) }}>{selectedResult.finalScore.toFixed(1)}%</div>
              <div style={{ background: selectedResult.zeroToleranceViolation ? '#dc2626' : getColor(selectedResult.finalScore), color: '#fff', padding: '4px 16px', borderRadius: '6px', display: 'inline-block', marginTop: '8px', fontWeight: '700' }}>{selectedResult.grade}</div>
            </div>
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
          </div>)}
        </div>)}
        {activeTab === 'grade' && <>
          <div style={{ background: 'rgba(30,30,40,0.9)', borderRadius: '20px', padding: '28px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '14px', color: '#94a3b8', textTransform: 'uppercase' }}>📋 Paste Ticket Conversation</h2>
            <textarea value={ticketContent} onChange={e => { setTicketContent(e.target.value); setAnalysisComplete(false); }} placeholder="Paste full ticket conversation here..." style={{ width: '100%', height: '200px', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '14px', resize: 'vertical' }} />
          </div>

          <div style={{ background: 'rgba(30,30,40,0.9)', borderRadius: '20px', padding: '28px', marginBottom: '24px', border: '1px solid rgba(16,185,129,0.2)' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: '14px', color: '#10b981', textTransform: 'uppercase' }}>🛒 Shopify Data (for AI analysis)</h2>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#64748b' }}>Paste Shopify order details and screenshots. AI will analyze them to verify agent actions.</p>
            <textarea value={shopifyNotes} onChange={e => setShopifyNotes(e.target.value)} onPaste={handleShopifyPaste} placeholder="Paste Shopify order details here..." style={{ width: '100%', height: '100px', padding: '16px', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '14px', resize: 'vertical' }} />
            {shopifyScreenshots.length > 0 && <div style={{ marginTop: '16px' }}><div style={{ fontSize: '12px', color: '#10b981', marginBottom: '8px' }}>📸 Screenshots ({shopifyScreenshots.length})</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>{shopifyScreenshots.map((img, i) => <div key={i} style={{ position: 'relative' }}><img src={img} alt={`Screenshot ${i+1}`} style={{ maxWidth: '150px', maxHeight: '100px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)' }} /><button onClick={() => removeScreenshot(i)} style={{ position: 'absolute', top: '-8px', right: '-8px', width: '24px', height: '24px', borderRadius: '50%', border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontSize: '14px' }}>×</button></div>)}</div></div>}
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <button onClick={analyzeTicket} disabled={!ticketContent.trim() || isAnalyzing} style={{ padding: '14px 28px', borderRadius: '10px', border: 'none', background: !ticketContent.trim() || isAnalyzing ? 'rgba(99,102,241,0.3)' : '#6366f1', color: '#fff', cursor: !ticketContent.trim() || isAnalyzing ? 'not-allowed' : 'pointer', fontWeight: '600', flex: 1 }}>{isAnalyzing ? '⏳ Analyzing...' : `🤖 Analyze with AI${shopifyScreenshots.length > 0 ? ` (+ ${shopifyScreenshots.length} screenshots)` : ''}`}</button>
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
