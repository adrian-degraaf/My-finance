import { supabase } from '@/lib/supabase'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return Response.json({ error: 'Missing userId' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('monthly_data')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      return Response.json({ error: 'Failed to fetch data', details: error }, { status: 500 })
    }

    const analysis = analyzeData(data)

    return Response.json({
      success: true,
      data: data,
      analysis: analysis,
    })
  } catch (error) {
    console.error('Error:', error)
    return Response.json({ error: 'Failed to fetch data', details: error.message }, { status: 500 })
  }
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
      'Eating Out': 300,
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
