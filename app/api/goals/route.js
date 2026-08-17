import { supabase } from '@/lib/supabase'

export async function POST(req) {
  try {
    const body = await req.json()
    const { userId, goalName, goalAmount, currentAmount, monthlySavings } = body

    if (!userId) {
      return Response.json({ error: 'Missing userId' }, { status: 400 })
    }

    // Check if goal exists
    const { data: existing } = await supabase
      .from('goals')
      .select('id')
      .eq('user_id', userId)
      .eq('goal_name', goalName)
      .single()

    let result
    if (existing) {
      // Update existing goal
      result = await supabase
        .from('goals')
        .update({
          goal_amount: goalAmount,
          current_amount: currentAmount,
          monthly_savings: monthlySavings,
          updated_at: new Date(),
        })
        .eq('id', existing.id)
        .select()
    } else {
      // Create new goal
      result = await supabase
        .from('goals')
        .insert({
          user_id: userId,
          goal_name: goalName,
          goal_amount: goalAmount,
          current_amount: currentAmount,
          monthly_savings: monthlySavings,
        })
        .select()
    }

    if (result.error) {
      console.error('Supabase error:', result.error)
      return Response.json({ error: 'Failed to save goal' }, { status: 500 })
    }

    return Response.json({
      success: true,
      goal: result.data[0],
    })
  } catch (error) {
    console.error('Error:', error)
    return Response.json({ error: 'Failed to save goal' }, { status: 500 })
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return Response.json({ error: 'Missing userId' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      console.error('Supabase error:', error)
      return Response.json({ error: 'Failed to fetch goals' }, { status: 500 })
    }

    return Response.json({
      success: true,
      goals: data || [],
    })
  } catch (error) {
    console.error('Error:', error)
    return Response.json({ error: 'Failed to fetch goals' }, { status: 500 })
  }
}
