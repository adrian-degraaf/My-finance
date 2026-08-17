'use client'

import { useState, useEffect } from 'react'
import styles from './GoalsTab.module.css'

export default function GoalsTab({ userId }) {
  const [goalAmount, setGoalAmount] = useState(40000)
  const [currentAmount, setCurrentAmount] = useState(15000)
  const [monthlySavings, setMonthlySavings] = useState(1017)
  const [goalName, setGoalName] = useState('House Deposit')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [goals, setGoals] = useState([])
  const [calculation, setCalculation] = useState(null)

  useEffect(() => {
    fetchGoals()
  }, [userId])

  const fetchGoals = async () => {
    try {
      const res = await fetch(`/api/goals?userId=${userId}`)
      const result = await res.json()
      if (result.success) {
        setGoals(result.goals)
        if (result.goals.length > 0) {
          const goal = result.goals[0]
          setGoalAmount(goal.goal_amount)
          setCurrentAmount(goal.current_amount)
          setMonthlySavings(goal.monthly_savings)
          setGoalName(goal.goal_name)
        }
      }
    } catch (err) {
      console.error('Error fetching goals:', err)
    }
  }

  const calculateGoal = () => {
    const remaining = goalAmount - currentAmount
    const months = Math.ceil(remaining / monthlySavings)
    const today = new Date()
    const targetDate = new Date(today.getFullYear(), today.getMonth() + months, today.getDate())

    setCalculation({
      remaining: remaining,
      months: months,
      targetDate: targetDate,
    })
  }

  const handleSaveGoal = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          goalName,
          goalAmount: parseFloat(goalAmount),
          currentAmount: parseFloat(currentAmount),
          monthlySavings: parseFloat(monthlySavings),
        }),
      })

      const result = await res.json()
      if (result.success) {
        setMessage('✓ Goal saved successfully')
        calculateGoal()
        fetchGoals()
      } else {
        setMessage(`✗ ${result.error}`)
      }
    } catch (err) {
      setMessage('Failed to save goal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="card">
        <h2>Savings Goals</h2>
        <form onSubmit={handleSaveGoal} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Goal Name</label>
            <input
              type="text"
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              placeholder="e.g., House Deposit"
            />
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Goal Amount (£)</label>
              <input
                type="number"
                value={goalAmount}
                onChange={(e) => setGoalAmount(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Current Savings (£)</label>
              <input
                type="number"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Monthly Savings (£)</label>
              <input
                type="number"
                value={monthlySavings}
                onChange={(e) => setMonthlySavings(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="primary" disabled={loading}>
            {loading ? 'Saving...' : 'Calculate & Save Goal'}
          </button>
        </form>

        {message && (
          <div className={message.startsWith('✓') ? 'success' : 'error'} style={{ marginTop: '1rem' }}>
            {message}
          </div>
        )}
      </div>

      {calculation && (
        <div className="card">
          <h3>Goal Progress</h3>
          <div className="grid">
            <div className="metric">
              <div className="metric-label">Amount Remaining</div>
              <div className="metric-value">£{calculation.remaining.toFixed(2)}</div>
            </div>

            <div className="metric">
              <div className="metric-label">Months to Goal</div>
              <div className="metric-value">{calculation.months}</div>
              <div className="metric-unit">Target: {calculation.targetDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</div>
            </div>

            <div className="metric">
              <div className="metric-label">Progress</div>
              <div className="metric-value">{((currentAmount / goalAmount) * 100).toFixed(1)}%</div>
              <div className="metric-unit">of goal achieved</div>
            </div>
          </div>

          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${(currentAmount / goalAmount) * 100}%` }}
            ></div>
          </div>

          <p style={{ marginTop: '1rem', fontSize: '14px', color: '#7f8c8d', textAlign: 'center' }}>
            {calculation.months <= 12
              ? `🎯 On track! You'll reach £${goalAmount.toLocaleString()} in ${calculation.months} months.`
              : calculation.months <= 24
              ? `📈 Solid progress. ${calculation.months} months to your goal—that's under 2 years.`
              : `⏳ ${calculation.months} months ahead. Consider increasing monthly savings to accelerate.`}
          </p>
        </div>
      )}

      {goals.length > 0 && !calculation && (
        <div className="card">
          <h3>Saved Goals</h3>
          {goals.map((goal) => (
            <div key={goal.id} className={styles.goalItem}>
              <p>
                <strong>{goal.goal_name}</strong>: £{goal.current_amount.toFixed(2)} of £{goal.goal_amount.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
