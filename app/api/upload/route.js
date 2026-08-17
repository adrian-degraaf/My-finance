import { supabase } from '@/lib/supabase'
import Papa from 'papaparse'

export async function POST(req) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')
    const userId = formData.get('userId')
    const fileName = file.name
    const accountType = formData.get('accountType')

    if (!file || !userId || !accountType) {
      return Response.json({ error: 'Missing file, userId, or accountType' }, { status: 400 })
    }

    const text = await file.text()
    
    const results = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    })

    const rows = results.data
    const transactions = []

    rows.forEach(row => {
      if (!row.Date) return

      const [day, month, year] = row.Date.split('/')
      const monthKey = `${year}-${month}`
      
      const localAmount = parseFloat(row['Local amount']) || 0
      
      if (localAmount === 0) return

      transactions.push({
        user_id: userId,
        month: monthKey,
        date: row.Date,
        category: row.Category || 'Other',
        type: row.Type || 'unknown',
        description: row.Name || row.Notes || '',
        amount: localAmount,
        account_type: accountType,
      })
    })

    if (transactions.length === 0) {
      return Response.json({ error: 'No valid transactions found in CSV' }, { status: 400 })
    }

    const { data: sourceData, error: sourceError } = await supabase
      .from('source')
      .insert({
        user_id: userId,
        source_type: accountType === 'main' ? 'main_account' : 'pot_account',
        source_name: fileName,
        transaction_count: transactions.length,
      })
      .select()

    if (sourceError) {
      console.error('Source creation error:', sourceError)
      return Response.json({ error: 'Failed to create source record' }, { status: 500 })
    }

    const sourceId = sourceData[0].id

    const transactionsWithSource = transactions.map(t => ({
      ...t,
      source_id: sourceId,
    }))

    const { data, error } = await supabase
      .from('monthly_data')
      .insert(transactionsWithSource)

    if (error) {
      console.error('Supabase error:', error)
      return Response.json({ error: 'Failed to save data: ' + error.message }, { status: 500 })
    }

    return Response.json({
      success: true,
      transactionsImported: transactions.length,
      sourceId: sourceId,
    })
  } catch (error) {
    console.error('Error:', error)
    return Response.json({ error: 'Upload failed: ' + error.message }, { status: 500 })
  }
}
