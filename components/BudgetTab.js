'use client'

import { useState, useEffect } from 'react'
import SourceHistory from './SourceHistory'
import styles from './BudgetTab.module.css'

export default function BudgetTab({ userId }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [data, setData] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showAccountTypeDialog, setShowAccountTypeDialog] = useState(false)
  const [excludedTypes, setExcludedTypes] = useState(new Set())
  const [availableTypes, setAvailableTypes] = useState([])

  useEffect(() => {
    fetchData()
  }, [userId])

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/data?userId=${userId}`)
      const result = await res.json()
      if (result.success) {
        setData(result.data)
        
        const types = [...new Set(result.data.map(row => row.type))]
        setAvailableTypes(types.sort())
        
        const filtered = result.data.filter(row => !excludedTypes.has(row.type))
        const newAnalysis = analyzeData(filtered)
        setAnalysis(newAnalysis)
      }
    } catch (err) {
      console.error('Error fetching data:', err)
    }
  }

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setShowAccountTypeDialog(true)
    }
  }

  const handleUpload = async (accountType) => {
    if (!file) return

    setShowAccountTypeDialog(false)
    setLoading(true)
    setMessage('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', userId)
      formData.append('accountType', accountType)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await res.json()
      if (result.success) {
        setMessage(`✓ Imported ${result.transactionsImported} transactions`)
        setFile(null)
        setRefreshKey(prev => prev + 1)
        setTimeout(() => fetchData(), 500)
      } else {
        setMessage(`✗ ${result.error}`)
      }
    } catch (err) {
      setMessage('Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const toggleTypeFilter = (type) => {
    const newExcluded = new Set(excludedTypes)
    if (newExcluded.has(type)) {
      newExcluded.delete(type)
    } else {
      newExcluded.add(type)
    }
    setExcludedTypes(newExcluded)
    
    if (data) {
      const filtered = data.filter(row => !newExcluded.has(row.type))
      const newAnalysis = analyzeData(filtered)
      setAnalysis(newAnalysis)
    }
  }

  // Combine Food & Entertainment categories
  const getCombinedCategories = (byCategory) => {
    const combined = { ...byCategory }
    const months = Object.keys(analysis.byMonth).length || 1
    
    // Match exact category names from DB
    const toMatch = ['Entertainment', 'Eating out', 'Groceries']
    let foodEnterTotal = 0
    
    toMatch.forEach(catName => {
      if (combined[catName]) {
        foodEnterTotal += combined[catName].total
        delete combined[catName]
      }
    })
    
    if (foodEnterTotal > 0) {
      const monthlyCatAvg = foodEnterTotal / months
      
      let status = 'normal'
      const normalRange = 1250
      if (monthlyCatAvg > normalRange * 1.2) {
        status = 'high'
      } else if (monthlyCatAvg < normalRange * 0.8) {
        status = 'low'
      }
      
      combined['Food & Entertainment'] = {
        total: foodEnterTotal,
        monthlyAvg: monthlyCatAvg,
        status: status,
      }
    }
    
    return combined
  }

  return (
    <div>
      <div className="card">
        <h2>Upload Monzo CSV</h2>
        <form onSubmit={(e) => e.preventDefault()} className={styles.form}>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            disabled={loading}
          />
        </form>

        {showAccountTypeDialog && (
          <div className={styles.dialog}>
            <div className={styles.dialogContent}>
              <h3>Which account is this CSV from?</h3>
              <p style={{ color: '#7f8c8d', fontSize: '14px', marginBottom: '1.5rem' }}>
                Select the account type so we can process the data correctly.
              </p>
              <div className={styles.dialogButtons}>
                <button 
                  className="primary"
                  onClick={() => handleUpload('main')}
                  disabled={loading}
                >
                  {loading ? 'Uploading...' : 'Main Bank Account'}
                </button>
                <button 
                  onClick={() => handleUpload('pot')}
                  disabled={loading}
                >
                  {loading ? 'Uploading...' : 'Pot Account'}
                </button>
                <button 
                  onClick={() => setShowAccountTypeDialog(false)}
                  style={{ background: '#ecf0f1', color: '#7f8c8d' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {message && (
          <div className={message.startsWith('✓') ? 'success' : 'error'}>
            {message}
          </div>
        )}

        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #ddd' }}>
          <SourceHistory key={refreshKey} userId={userId} />
        </div>
      </div>

      {analysis && availableTypes.length > 0 && (
        <>
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Filter by Transaction Type</h3>
            <div className={styles.typeFilterButtons}>
              {availableTypes.map(type => (
                <button
                  key={type}
                  className={excludedTypes.has(type) ? styles.filterButtonExcluded : styles.filterButtonIncluded}
                  onClick={() => toggleTypeFilter(type)}
                  style={{
                    opacity: excludedTypes.has(type) ? 0.5 : 1,
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '12px' }}>
              Greyed out types are excluded from calculations
            </p>
          </div>
        </>
      )}

      {analysis && (
        <>
          <div className="grid">
            <div className="metric">
              <div className="metric-label">Total Spend</div>
              <div className="metric-value">£{analysis.totalSpend}</div>
              <div className="metric-unit">{Object.keys(analysis.byMonth).length} months</div>
            </div>

            <div className="metric">
              <div className="metric-label">Monthly Average</div>
              <div className="metric-value">£{analysis.monthlyAverage}</div>
              <div className="metric-unit">vs £650 target</div>
            </div>

            <div className="metric">
              <div className="metric-label">Variance</div>
              <div className="metric-value" style={{
                color: parseFloat(analysis.variance) > 0 ? '#e74c3c' : '#27ae60'
              }}>
                {parseFloat(analysis.variance) > 0 ? '+' : ''}£{analysis.variance}
              </div>
              <div className="metric-unit">{analysis.variancePct}%</div>
            </div>
          </div>

          <div className="grid">
            <div className="metric">
              <div className="metric-label">Total Income</div>
              <div className="metric-value" style={{ color: '#27ae60' }}>£{analysis.totalIncome}</div>
              <div className="metric-unit">all sources</div>
            </div>

            <div className="metric">
              <div className="metric-label">Monthly Income Avg</div>
              <div className="metric-value" style={{ color: '#27ae60' }}>£{analysis.monthlyIncome}</div>
              <div className="metric-unit">average</div>
            </div>
          </div>

          <div className="card">
            <h3>Spending by Category</h3>
            <div className={styles.categoryTable}>
              <div className={styles.tableHeader}>
                <div className={styles.colCategory}>Category</div>
                <div className={styles.colTotal}>All Time</div>
                <div className={styles.colMonthly}>Monthly Avg</div>
                <div className={styles.colStatus}>Status</div>
              </div>
              {Object.entries(getCombinedCategories(analysis.byCategory))
                .sort((a, b) => b[1].total - a[1].total)
                .map(([category, info]) => {
                  const statusColor = 
                    info.status === 'high' ? '#e74c3c' :
                    info.status === 'low' ? '#3498db' :
                    '#27ae60'
                  
                  return (
                    <div key={category} className={styles.tableRow}>
                      <div className={styles.colCategory}>{category}</div>
                      <div className={styles.colTotal}>£{parseFloat(info.total).toFixed(2)}</div>
                      <div className={styles.colMonthly}>£{info.monthlyAvg.toFixed(2)}</div>
                      <div className={styles.colStatus}>
                        <span 
                          className={styles.statusBadge}
                          style={{ 
                            background: statusColor + '20',
                            color: statusColor,
                            borderColor: statusColor
                          }}
                        >
                          {info.status === 'high' ? '⬆ High' :
                           info.status === 'low' ? '⬇ Low' :
                           '✓ Normal'}
                        </span>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>

          <div className="card">
            <h3>Monthly Trend</h3>
            <div className={styles.monthlyChart}>
              {Object.entries(analysis.byMonth)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([month, amount]) => {
                  const maxAmount = Math.max(...Object.values(analysis.byMonth))
                  const height = (amount / maxAmount) * 100
                  const monthLabel = new Date(month + '-01').toLocaleDateString('en-GB', {
                    month: 'short',
                    year: '2-digit',
                  })
                  return (
                    <div key={month} className={styles.monthBar}>
                      <div
                        className={styles.monthBarFill}
                        style={{ height: `${height}%` }}
                      ></div>
                      <span className={styles.monthLabel}>{monthLabel}</span>
                    </div>
                  )
                })}
            </div>
          </div>
        </>
      )}

      {!analysis && (
        <div className="card">
          <p style={{ textAlign: 'center', color: '#7f8c8d' }}>
            Upload a Monzo CSV to see your spending analysis
          </p>
        </div>
      )}
    </div>
  )
}

function analyzeData(data) {
  if (!data || data.length === 0) {
    return {
      totalSpend: 0,
      monthlyAverage: 0,
      totalIncome: 0,
      monthlyIncome: 0,
      byCategory: {},
      byMonth: {},
      variance: 0,
      variancePct: 0,
    }
  }

  const byCategory = {}
  const byMonth = {}
  let totalSpend = 0
  let totalIncome = 0

  data.forEach(row => {
    const amount = parseFloat(row.amount) || 0
    
    if (amount < 0) {
      const spent = Math.abs(amount)
      totalSpend += spent
      byCategory[row.category] = (byCategory[row.category] || 0) + spent
      byMonth[row.month] = (byMonth[row.month] || 0) + spent
    }
    
    if (amount > 0) {
      totalIncome += amount
    }
  })

  const months = Object.keys(byMonth).length || 1
  const monthlyAverage = totalSpend / months
  const monthlyIncome = totalIncome / months
  const target = 650
  const variance = monthlyAverage - target
  const variancePct = ((variance / target) * 100).toFixed(1)

  const categoriesWithStatus = {}
  Object.entries(byCategory).forEach(([category, amount]) => {
    const monthlyCatAvg = amount / months
    let status = 'normal'
    
    const normalRanges = {
      'Entertainment': 650,
      'Eating out': 300,
      'Groceries': 250,
      'Transport': 150,
      'Gym': 120,
    }
    
    const normalRange = normalRanges[category] || 200
    if (monthlyCatAvg > normalRange * 1.2) {
      status = 'high'
    } else if (monthlyCatAvg < normalRange * 0.8) {
      status = 'low'
    }
    
    categoriesWithStatus[category] = {
      total: amount,
      monthlyAvg: monthlyCatAvg,
      status: status,
    }
  })

  return {
    totalSpend: totalSpend.toFixed(2),
    monthlyAverage: monthlyAverage.toFixed(2),
    totalIncome: totalIncome.toFixed(2),
    monthlyIncome: monthlyIncome.toFixed(2),
    byCategory: categoriesWithStatus,
    byMonth: byMonth,
    variance: variance.toFixed(2),
    variancePct: variancePct,
  }
}
