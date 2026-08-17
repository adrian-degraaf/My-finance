import { supabase } from '@/lib/supabase'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return Response.json({ error: 'Missing userId' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('source')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return Response.json({ error: 'Failed to fetch sources' }, { status: 500 })
    }

    return Response.json({
      success: true,
      sources: data || [],
    })
  } catch (error) {
    console.error('Error:', error)
    return Response.json({ error: 'Failed to fetch sources' }, { status: 500 })
  }
}
