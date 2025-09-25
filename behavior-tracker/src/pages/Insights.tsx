import { useState, useEffect } from 'react';
import { useAuth } from '../app/providers/AppProvider';
import { Nav } from '../components/Nav';
import { mockAdapter } from '../data/adapters/mock';
import { format, subDays, isWithinInterval } from 'date-fns';

interface BehaviorInsight {
  id: string;
  type: 'pattern' | 'trend' | 'alert' | 'recommendation';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  data: any;
  created_at: string;
  client_codes?: string[];
}

interface PatternAnalysis {
  pattern_type: 'temporal' | 'environmental' | 'behavioral';
  pattern_description: string;
  frequency: number;
  strength: number;
  recommendation: string;
}

interface TrendAnalysis {
  metric: 'frequency' | 'intensity' | 'duration';
  direction: 'increasing' | 'decreasing' | 'stable';
  change_percentage: number;
  timeframe_days: number;
  significance: 'low' | 'moderate' | 'high';
}

export function Insights() {
  const { auth } = useAuth();
  const [insights, setInsights] = useState<BehaviorInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d'>('30d');
  const [selectedClientCode, setSelectedClientCode] = useState<string>('all');

  useEffect(() => {
    generateInsights();
  }, [selectedTimeframe, selectedClientCode]);

  const generateInsights = async () => {
    try {
      setLoading(true);

      // Fetch recent logs for analysis
      const endDate = new Date();
      const startDate = subDays(endDate, selectedTimeframe === '7d' ? 7 : selectedTimeframe === '30d' ? 30 : 90);

      const logs = await mockAdapter.logs.list({
        date_from: format(startDate, 'yyyy-MM-dd'),
        date_to: format(endDate, 'yyyy-MM-dd'),
        client_code: selectedClientCode === 'all' ? undefined : selectedClientCode
      });

      // Generate AI-powered insights
      const generatedInsights: BehaviorInsight[] = [];

      // 1. Pattern Recognition - Time-based patterns
      const hourlyData = logs.reduce((acc: any, log: any) => {
        const hour = new Date(log.timestamp).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {});

      const peakHours = Object.entries(hourlyData)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 3);

      if (peakHours.length > 0) {
        generatedInsights.push({
          id: 'pattern-temporal-1',
          type: 'pattern',
          title: 'Peak Incident Times Identified',
          description: `${Math.round(peakHours[0][1] as number / logs.length * 100)}% of incidents occur between ${peakHours[0][0]}:00-${parseInt(peakHours[0][0]) + 1}:00. Consider increased staffing during these hours.`,
          priority: 'high',
          confidence: 85,
          data: { hourlyData, peakHours },
          created_at: new Date().toISOString(),
          client_codes: selectedClientCode === 'all' ? undefined : [selectedClientCode]
        });
      }

      // 2. Intensity Trend Analysis
      const recentLogs = logs.filter((log: any) =>
        isWithinInterval(new Date(log.timestamp), { start: subDays(endDate, 14), end: endDate })
      );
      const olderLogs = logs.filter((log: any) =>
        isWithinInterval(new Date(log.timestamp), { start: subDays(endDate, 28), end: subDays(endDate, 14) })
      );

      const avgRecentIntensity = recentLogs.reduce((sum: number, log: any) => sum + log.intensity, 0) / recentLogs.length || 0;
      const avgOlderIntensity = olderLogs.reduce((sum: number, log: any) => sum + log.intensity, 0) / olderLogs.length || 0;

      if (recentLogs.length > 0 && olderLogs.length > 0) {
        const intensityChange = ((avgRecentIntensity - avgOlderIntensity) / avgOlderIntensity) * 100;

        if (Math.abs(intensityChange) > 15) {
          generatedInsights.push({
            id: 'trend-intensity-1',
            type: 'trend',
            title: intensityChange > 0 ? 'Rising Behavior Intensity Detected' : 'Improving Behavior Intensity Trend',
            description: `Average behavior intensity has ${intensityChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(intensityChange).toFixed(1)}% over the past 2 weeks. ${intensityChange > 0 ? 'Immediate intervention planning recommended.' : 'Current strategies showing positive results.'}`,
            priority: intensityChange > 25 ? 'critical' : intensityChange > 0 ? 'high' : 'medium',
            confidence: 78,
            data: { avgRecentIntensity, avgOlderIntensity, change: intensityChange },
            created_at: new Date().toISOString(),
            client_codes: selectedClientCode === 'all' ? undefined : [selectedClientCode]
          });
        }
      }

      // 3. Behavioral Clustering & Recommendations
      const behaviorFrequency = logs.reduce((acc: any, log: any) => {
        acc[log.behavior_name] = (acc[log.behavior_name] || 0) + 1;
        return acc;
      }, {});

      const topBehaviors = Object.entries(behaviorFrequency)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 3);

      if (topBehaviors.length > 0) {
        const dominantBehavior = topBehaviors[0];
        const behaviorPercentage = Math.round((dominantBehavior[1] as number) / logs.length * 100);

        generatedInsights.push({
          id: 'recommendation-behavioral-1',
          type: 'recommendation',
          title: 'Focused Intervention Opportunity',
          description: `"${dominantBehavior[0]}" accounts for ${behaviorPercentage}% of all incidents. Developing a targeted intervention strategy for this behavior could significantly reduce overall incidents.`,
          priority: behaviorPercentage > 40 ? 'high' : 'medium',
          confidence: 82,
          data: { behaviorFrequency, topBehaviors, dominantBehavior },
          created_at: new Date().toISOString(),
          client_codes: selectedClientCode === 'all' ? undefined : [selectedClientCode]
        });
      }

      // 4. Environmental/Contextual Alerts
      const contextualPatterns = logs.reduce((acc: any, log: any) => {
        if (log.antecedent) {
          const keywords = log.antecedent.toLowerCase().split(' ');
          keywords.forEach((word: string) => {
            if (word.length > 3) { // Filter out small words
              acc[word] = (acc[word] || 0) + 1;
            }
          });
        }
        return acc;
      }, {});

      const commonTriggers = Object.entries(contextualPatterns)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 3);

      if (commonTriggers.length > 0 && (commonTriggers[0][1] as number) > 3) {
        generatedInsights.push({
          id: 'alert-environmental-1',
          type: 'alert',
          title: 'Common Trigger Pattern Detected',
          description: `"${commonTriggers[0][0]}" appears in ${commonTriggers[0][1]} incident antecedents. Consider environmental modifications or proactive interventions when this trigger is present.`,
          priority: 'medium',
          confidence: 71,
          data: { contextualPatterns, commonTriggers },
          created_at: new Date().toISOString(),
          client_codes: selectedClientCode === 'all' ? undefined : [selectedClientCode]
        });
      }

      // 5. Duration Analysis & Efficiency Insights
      const avgDuration = logs.reduce((sum: number, log: any) => sum + (log.duration_min || 0), 0) / logs.length;
      const longDurationLogs = logs.filter((log: any) => (log.duration_min || 0) > avgDuration * 1.5);

      if (longDurationLogs.length > logs.length * 0.2) {
        generatedInsights.push({
          id: 'insight-duration-1',
          type: 'pattern',
          title: 'Extended Duration Events Pattern',
          description: `${Math.round(longDurationLogs.length / logs.length * 100)}% of incidents last significantly longer than average (${avgDuration.toFixed(1)} min). Review de-escalation techniques and intervention timing.`,
          priority: 'medium',
          confidence: 76,
          data: { avgDuration, longDurationCount: longDurationLogs.length, totalCount: logs.length },
          created_at: new Date().toISOString(),
          client_codes: selectedClientCode === 'all' ? undefined : [selectedClientCode]
        });
      }

      // Sort insights by priority and confidence
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      generatedInsights.sort((a, b) => {
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff === 0) {
          return b.confidence - a.confidence;
        }
        return priorityDiff;
      });

      setInsights(generatedInsights);
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '📊';
      case 'low': return '💡';
      default: return '📋';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pattern': return '🔍';
      case 'trend': return '📈';
      case 'alert': return '🔔';
      case 'recommendation': return '💡';
      default: return '📋';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'var(--success)';
    if (confidence >= 60) return 'var(--warning)';
    return 'var(--secondary)';
  };

  const clients = ['all', 'CLI001', 'CLI002', 'CLI003']; // Mock client codes

  if (loading) {
    return <div className="loading">Analyzing behavioral patterns...</div>;
  }

  return (
    <div className="page-container">
      <Nav />

      <div className="page-content">
        <div className="page-header">
          <h1>🧠 Smart Behavior Insights</h1>
          <p>AI-powered analysis of behavioral patterns, trends, and recommendations</p>
        </div>

        {/* Filters */}
        <div className="insights-filters">
          <div className="filter-group">
            <label>Timeframe</label>
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as any)}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Client Focus</label>
            <select
              value={selectedClientCode}
              onChange={(e) => setSelectedClientCode(e.target.value)}
            >
              {clients.map(code => (
                <option key={code} value={code}>
                  {code === 'all' ? 'All Clients' : code}
                </option>
              ))}
            </select>
          </div>

          <button onClick={generateInsights} className="btn-primary">
            🔄 Refresh Analysis
          </button>
        </div>

        {/* Insights Summary Stats */}
        <div className="insights-summary">
          <div className="summary-stat">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <div className="stat-value">{insights.length}</div>
              <div className="stat-label">Active Insights</div>
            </div>
          </div>
          <div className="summary-stat">
            <div className="stat-icon">🚨</div>
            <div className="stat-content">
              <div className="stat-value">{insights.filter(i => i.priority === 'critical' || i.priority === 'high').length}</div>
              <div className="stat-label">High Priority</div>
            </div>
          </div>
          <div className="summary-stat">
            <div className="stat-icon">🤖</div>
            <div className="stat-content">
              <div className="stat-value">{Math.round(insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length) || 0}%</div>
              <div className="stat-label">Avg Confidence</div>
            </div>
          </div>
        </div>

        {/* Insights List */}
        {insights.length === 0 ? (
          <div className="no-data">
            <div className="no-data-icon">🔍</div>
            <h3>Analyzing Patterns...</h3>
            <p>Not enough data yet to generate meaningful insights. Continue logging behaviors to unlock AI-powered recommendations.</p>
          </div>
        ) : (
          <div className="insights-list">
            {insights.map((insight) => (
              <div key={insight.id} className={`insight-card priority-${insight.priority}`}>
                <div className="insight-header">
                  <div className="insight-title">
                    <span className="insight-type-icon">{getTypeIcon(insight.type)}</span>
                    <span className="insight-priority-icon">{getPriorityIcon(insight.priority)}</span>
                    <h3>{insight.title}</h3>
                  </div>
                  <div className="insight-meta">
                    <div className="confidence-badge">
                      <div
                        className="confidence-bar"
                        style={{
                          width: `${insight.confidence}%`,
                          backgroundColor: getConfidenceColor(insight.confidence)
                        }}
                      ></div>
                      <span className="confidence-text">{insight.confidence}% confidence</span>
                    </div>
                    <span className="insight-type">{insight.type}</span>
                  </div>
                </div>

                <div className="insight-content">
                  <p>{insight.description}</p>
                </div>

                {/* Data Visualization */}
                {insight.type === 'pattern' && insight.data.hourlyData && (
                  <div className="insight-visualization">
                    <h4>Peak Activity Times</h4>
                    <div className="hourly-chart">
                      {Object.entries(insight.data.hourlyData).map(([hour, count]) => (
                        <div key={hour} className="hour-bar">
                          <div
                            className="bar"
                            style={{ height: `${(count as number) / Math.max(...Object.values(insight.data.hourlyData).map(Number)) * 60}px` }}
                          ></div>
                          <span className="hour-label">{hour}h</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {insight.type === 'trend' && insight.data.change && (
                  <div className="insight-visualization">
                    <h4>Intensity Trend</h4>
                    <div className="trend-indicator">
                      <div className="trend-arrow">
                        {insight.data.change > 0 ? '📈' : '📉'}
                      </div>
                      <div className="trend-details">
                        <span className="trend-change">{Math.abs(insight.data.change).toFixed(1)}%</span>
                        <span className="trend-direction">{insight.data.change > 0 ? 'increase' : 'decrease'}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="insight-actions">
                  <button className="btn-link">View Details</button>
                  <button className="btn-link">Create Action Plan</button>
                  {auth?.user?.role === 'supervisor' && (
                    <button className="btn-link">Share with Team</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI Disclaimer */}
        <div className="ai-disclaimer">
          <p>
            <strong>🤖 AI-Powered Insights:</strong> These insights are generated using advanced pattern recognition algorithms.
            Always combine AI recommendations with professional judgment and team expertise.
          </p>
        </div>
      </div>
    </div>
  );
}