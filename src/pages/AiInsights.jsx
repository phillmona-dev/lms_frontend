import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Icon = ({ d, size = 18, color = 'currentColor', strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const icons = {
  cpu:     "M12 2V6M12 18V22M6 12H2M22 12H18M18 18L15.5 15.5M18 6L15.5 8.5M6 18L8.5 15.5M6 6L8.5 8.5",
  alert:   "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  shield:  "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  chart:   "M18 20V10M12 20V4M6 20v-6",
  users:   "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  back:    "M19 12H5M12 19l-7-7 7-7",
  info:    "M12 16v-4M12 8h.01M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0z",
  arrow:   "M5 12h14M12 5l7 7-7 7",
};

export default function AiInsights() {
  const [schoolInsights, setSchoolInsights] = useState([]);
  const [studentRisk, setStudentRisk] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('school'); // 'school' or 'students'

  useEffect(() => {
    fetchAiData();
  }, []);

  const fetchAiData = async () => {
    setLoading(true);
    try {
      const [schoolRes, studentRes] = await Promise.all([
        axios.get('/api/ai-insights/school'),
        axios.get('/api/ai-insights/students/risk')
      ]);
      setSchoolInsights(schoolRes.data);
      setStudentRisk(studentRes.data);
    } catch (err) {
      console.error("AI Insight fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level) => {
    if (level === 'HIGH') return '#ef4444';
    if (level === 'MEDIUM') return '#f59e0b';
    return '#10b981';
  };

  const getRiskBg = (level) => {
    if (level === 'HIGH') return '#fef2f2';
    if (level === 'MEDIUM') return '#fffbeb';
    return '#f0fdf4';
  };

  if (loading && schoolInsights.length === 0) return <div className="flex-center full-screen">Analyzing LMS Data...</div>;

  return (
    <div style={{ fontFamily: 'Manrope, system-ui, sans-serif', maxWidth: 1200, margin: '0 auto', color: 'var(--text-primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
        <div>
          <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            <Icon d={icons.back} size={16} />
            Back to Dashboard
          </Link>
          <h1 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>AI Insights & Proactive Risks</h1>
          <p style={{ margin: '0.5rem 0 0', color: 'var(--text-secondary)' }}>Automated analysis of performance, behavior and attendance patterns.</p>
        </div>
        
        <div style={{ display: 'flex', background: 'var(--bg-color)', padding: '0.4rem', borderRadius: '14px', gap: '0.25rem', border: '1px solid var(--surface-border)' }}>
           <button onClick={() => setActiveSection('school')} style={{
             padding: '0.6rem 1.25rem', borderRadius: '10px', border: 'none',
             background: activeSection === 'school' ? 'var(--surface-color)' : 'transparent',
             color: activeSection === 'school' ? 'var(--primary)' : 'var(--text-secondary)',
             fontWeight: 700, cursor: 'pointer', boxShadow: activeSection === 'school' ? 'var(--shadow-sm)' : 'none'
           }}>Global View</button>
           <button onClick={() => setActiveSection('students')} style={{
             padding: '0.6rem 1.25rem', borderRadius: '10px', border: 'none',
             background: activeSection === 'students' ? 'var(--surface-color)' : 'transparent',
             color: activeSection === 'students' ? 'var(--primary)' : 'var(--text-secondary)',
             fontWeight: 700, cursor: 'pointer', boxShadow: activeSection === 'students' ? 'var(--shadow-sm)' : 'none'
           }}>Student Risk List</button>
        </div>
      </div>

      {activeSection === 'school' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
            {schoolInsights.map((insight, idx) => (
              <div key={idx} style={{ 
                background: 'var(--surface-color)', borderRadius: '24px', padding: '2rem', border: '1px solid var(--surface-border)', 
                boxShadow: 'var(--shadow-md)', display: 'flex', flexDirection: 'column', gap: '1.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ 
                    fontSize: '0.75rem', fontWeight: 800, padding: '0.4rem 0.85rem', borderRadius: '20px',
                    color: getRiskColor(insight.riskLevel), background: getRiskBg(insight.riskLevel),
                    border: `1px solid ${getRiskColor(insight.riskLevel)}22`
                  }}>
                    {insight.riskLevel} RISK
                  </span>
                  <div style={{ color: getRiskColor(insight.riskLevel) }}><Icon d={icons.cpu} size={20} /></div>
                </div>
                
                <div>
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{insight.insightType?.replace(/_/g, ' ') || 'System Insight'}</h3>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{insight.summary}</p>
                </div>

                <div style={{ padding: '1rem', background: 'var(--bg-color)', borderRadius: '16px', borderLeft: `4px solid ${getRiskColor(insight.riskLevel)}` }}>
                  <p style={{ margin: '0 0 0.4rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Recommended Action</p>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>{insight.recommendedAction}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--surface-color)', borderRadius: '24px', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-color)', borderBottom: '1px solid var(--surface-border)' }}>
                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Student Name</th>
                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Risk Level</th>
                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Primary Signals</th>
                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Stats</th>
                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {studentRisk.map((risk, i) => (
                <tr key={risk.studentId} style={{ borderBottom: i < studentRisk.length - 1 ? '1px solid var(--surface-border)' : 'none' }}>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{risk.studentName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ID: {risk.studentId?.toString().slice(0, 8)}...</div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <span style={{ 
                      fontSize: '0.75rem', fontWeight: 800, padding: '0.35rem 0.75rem', borderRadius: '20px',
                      color: getRiskColor(risk.riskLevel), background: getRiskBg(risk.riskLevel)
                    }}>
                      {risk.riskLevel}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{risk.reason}</p>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Attendance</span>
                        <span style={{ fontWeight: 700, color: risk.attendanceRate < 0.6 ? 'var(--danger)' : 'var(--text-primary)' }}>{Math.round(risk.attendanceRate)}%</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Assignments</span>
                        <span style={{ fontWeight: 700, color: risk.assignmentCompletionRate < 0.6 ? 'var(--danger)' : 'var(--text-primary)' }}>{Math.round(risk.assignmentCompletionRate)}%</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                    <Link to="/student-monitoring" style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none' }}>Intervene</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
