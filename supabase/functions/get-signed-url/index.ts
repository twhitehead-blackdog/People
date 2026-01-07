import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface SignedUrlRequest {
  path: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verificar autenticación
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    // Parsear request
    const { path }: SignedUrlRequest = await req.json()

    if (!path) {
      return new Response('Path is required', { status: 400, headers: corsHeaders })
    }

    // Generar signed URL con expiración de 1 hora
    const { data, error } = await supabase.storage
      .from('private-documents')
      .createSignedUrl(path, 3600) // 1 hora

    if (error || !data?.signedUrl) {
      console.error('Signed URL error:', error)
      return new Response('Failed to generate signed URL', { status: 500, headers: corsHeaders })
    }

    return new Response(data.signedUrl, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain'
      }
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response('Internal server error', {
      status: 500,
      headers: corsHeaders
    })
  }
})