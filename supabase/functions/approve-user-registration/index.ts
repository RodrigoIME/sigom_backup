import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { requestId, approve, requestedModules, name, email } = await req.json()

    console.log('Processing registration request:', { requestId, approve, email })

    if (!approve) {
      console.log('Request rejected by admin')
      return new Response(
        JSON.stringify({ success: true, message: 'Request rejected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar a solicitação
    const { data: request, error: fetchError } = await supabaseAdmin
      .from('user_registration_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (fetchError) {
      console.error('Error fetching request:', fetchError)
      throw fetchError
    }

    console.log('Request found:', request)

    // Criar usuário via Admin API
    const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      email_confirm: true,
      user_metadata: {
        name: name
      }
    })

    if (userError) {
      console.error('Error creating user:', userError)
      throw userError
    }

    console.log('User created successfully:', newUser.user.id)

    // Adicionar role 'user'
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: 'user'
      })

    if (roleError) {
      console.error('Error adding role:', roleError)
      throw roleError
    }

    console.log('User role added')

    // Adicionar módulos solicitados
    const moduleInserts = requestedModules.map((module: string) => ({
      user_id: newUser.user.id,
      module: module,
    }))

    const { error: modulesError } = await supabaseAdmin
      .from('user_modules')
      .insert(moduleInserts)

    if (modulesError) {
      console.error('Error adding modules:', modulesError)
      throw modulesError
    }

    console.log('Modules added:', requestedModules)

    // Atualizar status da solicitação
    const { error: updateError } = await supabaseAdmin
      .from('user_registration_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    if (updateError) {
      console.error('Error updating request status:', updateError)
      throw updateError
    }

    console.log('Registration approved successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User created and approved successfully',
        userId: newUser.user.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in approve-user-registration:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
