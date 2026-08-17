'use client'

import { useState, useEffect } from 'react'
import styles from './SourceHistory.module.css'

export default function SourceHistory({ userId }) {
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSources()
  }, [userId])

  const fetchSources = async () => {
    try {
      const res = await fetch(`/api/sources?userId=${userId}`)
      const result = await res.json()
      if (result.success) {
        setSources(result.sources)
      }
    } catch (err) {
      console.error('Error fetching sources:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', color: '#7f8c8d' }}>Loading sources...</div>
  }

  if (sources.length === 0) {
    return <p style={{ color: '#7f8c8d', fontSize: '14px' }}>No data sources yet</p>
  }

  return (
    <div className={styles.sourceList}>
      <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>Data Sources</h4>
      {sources.map(source => (
        <div key={source.id} className={styles.sourceItem}>
          <div className={styles.sourceHeader}>
            <span className={styles.sourceName}>{source.source_name}</span>
            <span className={styles.sourceCount}>{source.transaction_count} transactions</span>
          </div>
          <div className={styles.sourceDate}>
            {new Date(source.created_at).toLocaleDateString('en-GB', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
