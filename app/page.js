'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import BudgetTab from '@/components/BudgetTab'
import GoalsTab from '@/components/GoalsTab'
import InsightsTab from '@/components/InsightsTab'
import styles from './page.module.css'

export default function Home() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('budget')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    setLoading(false)
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setError('')
    
    try {
      let result
      if (isSignUp) {
        result = await supabase.auth.signUp({ email, password })
      } else {
        result = await supabase.auth.signInWithPassword({ email, password })
      }

      if (result.error) {
        setError(result.error.message)
      } else {
        setUser(result.data.user)
        setEmail('')
        setPassword('')
      }
    } catch (err) {
      setError('Authentication failed')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  if (loading) {
    return <div className={styles.loading}>Loading...</div>
  }

  if (!user) {
    return (
      <main>
        <div className={styles.authContainer}>
          <div className={styles.authCard}>
            <h1>Financial Tracker</h1>
            <p className={styles.tagline}>Budget analysis and savings goal tracking</p>
            
            {error && <div className="error">{error}</div>}
            
            <form onSubmit={handleAuth}>
              <div className={styles.formGroup}>
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <button type="submit" className="primary" style={{ width: '100%' }}>
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </button>
            </form>

            <p className={styles.toggleAuth}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              {' '}
              <button 
                onClick={() => setIsSignUp(!isSignUp)}
                style={{ background: 'none', border: 'none', color: '#3498db', cursor: 'pointer', padding: 0 }}
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main>
      <div className={styles.header}>
        <div>
          <h1>Financial Tracker</h1>
          <p className={styles.userEmail}>Logged in as {user.email}</p>
        </div>
        <button onClick={handleLogout}>Logout</button>
      </div>

      <div className="tabs">
        <button
          className={`tab-button ${activeTab === 'budget' ? 'active' : ''}`}
          onClick={() => setActiveTab('budget')}
        >
          Budget
        </button>
        <button
          className={`tab-button ${activeTab === 'goals' ? 'active' : ''}`}
          onClick={() => setActiveTab('goals')}
        >
          Goals
        </button>
        <button
          className={`tab-button ${activeTab === 'insights' ? 'active' : ''}`}
          onClick={() => setActiveTab('insights')}
        >
          Insights
        </button>
      </div>

      {activeTab === 'budget' && <BudgetTab userId={user.id} />}
      {activeTab === 'goals' && <GoalsTab userId={user.id} />}
      {activeTab === 'insights' && <InsightsTab userId={user.id} />}
    </main>
  )
}
