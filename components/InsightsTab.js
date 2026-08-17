'use client'

import { useState, useEffect } from 'react'

export default function InsightsTab({ userId }) {
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalysis()
  }, [userId])

  const fetchAnalysis = async () => {
    try {
      const res = await fetch(`/api/data?userId=${userId}`)
      const result = await res.json()
      if (result.success) {
        setAnalysis(result.analysis)
      }
    } catch (err) {
      console.error('Error fetching analysis:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="card"><p style={{ textAlign: 'center', color: '#7f8c8d' }}>Loading insights...</p></div>
  }

  if (!analysis || analysis.totalSpend === 0) {
    return (
      <div className="card">
        <h2>AI Insights</h2>
        <p style={{ textAlign: 'center', color: '#7f8c8d', marginTop: '1rem' }}>
          Upload a CSV file to see personalized spending analysis
        </p>
      </div>
    )
  }

  const total = parseFloat(analysis.totalSpend)
  const monthly = parseFloat(analysis.monthlyAverage)
  const variance = parseFloat(analysis.variance)
  
  // Find top category
  let topCategory = null
  let topAmount = 0
  Object.entries(analysis.byCategory).forEach(([cat, info]) => {
    if (info.total > topAmount) {
      topAmount = info.total
      topCategory = cat
    }
  })

  return (
    <div className="card">
      <h2>AI Insights</h2>
      <div style={{ marginTop: '1rem', lineHeight: '1.8', fontSize: '14px', color: '#2c3e50' }}>
        <p>
          <strong>Overview:</strong> You spent £{total.toFixed(2)} over {Object.keys(analysis.byMonth).length} months 
          (£{monthly.toFixed(2)}/month average).
        </p>

        {topCategory && (
          <p>
            <strong>Top category:</strong> {topCategory} at £{topAmount.toFixed(2)} 
            ({((topAmount / total) * 100).toFixed(1)}% of spend).
          </p>
        )}

        {variance > 0 ? (
          <p>
            <strong>Budget gap:</strong> You're £{variance.toFixed(2)} over your £650 target each month. 
            Consider cutting back on {topCategory?.toLowerCase() || 'discretionary spending'} 
            or reducing eating out frequency to hit your budget.
          </p>
        ) : (
          <p>
            <strong>Budget health:</strong> You're tracking £{Math.abs(variance).toFixed(2)} under budget—excellent discipline!
          </p>
        )}

        <p>
          <strong>Recommendation:</strong> Upload your next Monzo CSV on the 1st of each month for monthly tracking 
          and trend analysis.
        </p>

        <p style={{ marginTop: '1.5rem', padding: '12px', background: '#f0f8ff', borderRadius: '6px', borderLeft: '3px solid #3498db' }}>
          💡 <strong>Pro tip:</strong> Your savings goals are on track. At your current rate (£{monthly.toFixed(2)}/month), 
          you're building wealth steadily.
        </p>
      </div>
    </div>
  )
}
