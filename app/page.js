=== ADD THESE STATE VARIABLES (after other useState declarations) ===

const [coachingDateFilter, setCoachingDateFilter] = useState('30days');
const [coachingAgentFilter, setCoachingAgentFilter] = useState('all');
const [selectedCoachingAgent, setSelectedCoachingAgent] = useState(null);


=== ADD THIS FUNCTION (after getAnalytics function) ===

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
      agentData[r.agentName] = {
        name: r.agentName, evaluations: [], totalScore: 0, count: 0, violations: 0,
        categories: {
          softSkills: { scores: [], subScores: { tone: [], empathy: [], professionalism: [], clarity: [] } },
          issueUnderstanding: { scores: [], subScores: { correctIdentification: [], rootCauseAnalysis: [], customerContext: [], escalationRecognition: [] } },
          productProcess: { scores: [], subScores: { policyAccuracy: [], sopAdherence: [], solutionCorrectness: [], escalationProcess: [] } },
          toolsUtilization: { scores: [], subScores: { gorgiasUsage: [], internalNotes: [], shopifyUsage: [] } }
        },
        feedbacks: []
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
    Object.entries(a.categories).forEach(([cat, data]) => {
      subAvg[cat] = {};
      Object.entries(data.subScores).forEach(([sub, vals]) => {
        subAvg[cat][sub] = vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : 0;
      });
    });
    const allSubs = [];
    Object.entries(subAvg).forEach(([cat, subs]) => {
      Object.entries(subs).forEach(([sub, val]) => {
        allSubs.push({ category: cat, skill: sub, score: val });
      });
    });
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


=== ADD before return statement ===

const coaching = getCoachingAnalysis();


=== ADD coaching tab button (after analytics button in tab bar) ===

<button onClick={() => setActiveTab('coaching')} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: activeTab === 'coaching' ? '#6366f1' : 'rgba(255,255,255,0.05)', color: activeTab === 'coaching' ? '#fff' : '#94a3b8', cursor: 'pointer', fontWeight: '600' }}>🎓 Coaching</button>


=== ADD coaching tab content (after analytics tab content, before grade tab) ===

{activeTab === 'coaching' && (
  <div>
    <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#64748b' }}>Time Period</label>
        <select value={coachingDateFilter} onChange={e => { setCoachingDateFilter(e.target.value); setSelectedCoachingAgent(null); }} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(30,30,40,0.9)', color: '#e2e8f0', cursor: 'pointer' }}>
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
          <option value="all">All Time</option>
        </select>
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: '#64748b' }}>Agent</label>
        <select value={coachingAgentFilter} onChange={e => { setCoachingAgentFilter(e.target.value); setSelectedCoachingAgent(null); }} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(30,30,40,0.9)', color: '#e2e8f0', cursor: 'pointer' }}>
          <option value="all">All Agents</option>
          {uniqueAgents.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
    </div>

    {!coaching ? (
      <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
        <p style={{ color: '#64748b' }}>{isLoading ? '⏳ Loading...' : 'No data'}</p>
      </div>
    ) : (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.15), rgba(220,38,38,0.05))', borderRadius: '16px', padding: '20px', border: '1px solid rgba(220,38,38,0.2)' }}>
            <div style={{ fontSize: '12px', color: '#fca5a5', marginBottom: '6px' }}>🎯 Needs Coaching</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#dc2626' }}>{coaching.needsCoaching.length}</div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))', borderRadius: '16px', padding: '20px', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div style={{ fontSize: '12px', color: '#6ee7b7', marginBottom: '6px' }}>⭐ Top Performers</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#10b981' }}>{coaching.topPerformers.length}</div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05))', borderRadius: '16px', padding: '20px', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div style={{ fontSize: '12px', color: '#a5b4fc', marginBottom: '6px' }}>👥 Total Agents</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#6366f1' }}>{coaching.totalAgents}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selectedCoachingAgent ? '1fr 1fr' : '1fr', gap: '20px' }}>
          <div>
            {coaching.needsCoaching.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#fca5a5' }}>🚨 Needs Coaching</h3>
                {coaching.needsCoaching.map(agent => (
                  <div key={agent.name} onClick={() => setSelectedCoachingAgent(agent)} style={{ background: selectedCoachingAgent?.name === agent.name ? 'rgba(99,102,241,0.15)' : 'rgba(30,30,40,0.9)', borderRadius: '12px', padding: '16px', marginBottom: '12px', border: selectedCoachingAgent?.name === agent.name ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: getColor(agent.avgScore) + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: getColor(agent.avgScore) }}>{agent.grade}</div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#e2e8f0' }}>{agent.name}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{agent.count} evaluations</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: getColor(agent.avgScore) }}>{agent.avgScore.toFixed(1)}%</div>
                        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600', background: agent.priority === 'high' ? 'rgba(220,38,38,0.2)' : 'rgba(245,158,11,0.2)', color: agent.priority === 'high' ? '#fca5a5' : '#fbbf24' }}>{agent.priority.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {coaching.topPerformers.length > 0 && (
              <div>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#6ee7b7' }}>🌟 Top Performers</h3>
                {coaching.topPerformers.map(agent => (
                  <div key={agent.name} onClick={() => setSelectedCoachingAgent(agent)} style={{ background: selectedCoachingAgent?.name === agent.name ? 'rgba(99,102,241,0.15)' : 'rgba(30,30,40,0.9)', borderRadius: '12px', padding: '16px', marginBottom: '12px', border: selectedCoachingAgent?.name === agent.name ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: getColor(agent.avgScore) + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: getColor(agent.avgScore) }}>{agent.grade}</div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#e2e8f0' }}>{agent.name}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{agent.count} evaluations</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: getColor(agent.avgScore) }}>{agent.avgScore.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedCoachingAgent && (
            <div style={{ background: 'rgba(30,30,40,0.9)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '20px', color: '#f1f5f9' }}>{selectedCoachingAgent.name}</h3>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>{selectedCoachingAgent.count} evaluations</div>
                </div>
                <button onClick={() => setSelectedCoachingAgent(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '20px' }}>×</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '14px', background: getColor(selectedCoachingAgent.avgScore) + '22', border: '2px solid ' + getColor(selectedCoachingAgent.avgScore), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '700', color: getColor(selectedCoachingAgent.avgScore) }}>{selectedCoachingAgent.grade}</div>
                <div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: getColor(selectedCoachingAgent.avgScore) }}>{selectedCoachingAgent.avgScore.toFixed(1)}%</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Average Score</div>
                </div>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#f1f5f9' }}>📊 Categories</h4>
                <ProgressBar value={selectedCoachingAgent.catAvg.softSkills} color="#06b6d4" label="Soft Skills" />
                <ProgressBar value={selectedCoachingAgent.catAvg.issueUnderstanding} color="#8b5cf6" label="Issue Understanding" />
                <ProgressBar value={selectedCoachingAgent.catAvg.productProcess} color="#f59e0b" label="Product & Process" />
                <ProgressBar value={selectedCoachingAgent.catAvg.toolsUtilization} color="#10b981" label="Tools" />
              </div>
              {selectedCoachingAgent.weaknesses.length > 0 && (
                <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(220,38,38,0.08)', borderRadius: '12px', borderLeft: '3px solid #dc2626' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#fca5a5' }}>🎯 Focus Areas</h4>
                  {selectedCoachingAgent.weaknesses.map((w, i) => (
                    <div key={i} style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', color: '#e2e8f0' }}>{w.skill.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#dc2626' }}>{w.score.toFixed(1)}/5</span>
                    </div>
                  ))}
                </div>
              )}
              {selectedCoachingAgent.strengths.length > 0 && (
                <div style={{ padding: '16px', background: 'rgba(16,185,129,0.08)', borderRadius: '12px', borderLeft: '3px solid #10b981' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#6ee7b7' }}>💪 Strengths</h4>
                  {selectedCoachingAgent.strengths.map((s, i) => (
                    <div key={i} style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', color: '#e2e8f0' }}>{s.skill.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#10b981' }}>{s.score.toFixed(1)}/5</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )}
  </div>
)}
