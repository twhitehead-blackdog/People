import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface UploadRequest {
  requestId: string
  fileName: string
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Solo en backend - ¡SEGURO!
    )

    // Verificar autenticación del usuario HR
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

    // Verificar que es empleado HR
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select(`
        id,
        position:positions(is_hr)
      `)
      .eq('auth_user_id', user.id)
      .single()

    if (employeeError || !employee?.position?.is_hr) {
      return new Response('Forbidden - HR access required', {
        status: 403,
        headers: corsHeaders
      })
    }

    // Parsear FormData
    const formData = await req.formData()
    const requestId = formData.get('requestId') as string
    const file = formData.get('file') as File
    const fileName = formData.get('fileName') as string

    if (!requestId || !file || !fileName) {
      return new Response('Missing required fields', { status: 400, headers: corsHeaders })
    }

    // Validar que el archivo es PDF
    if (!file.type.includes('pdf')) {
      return new Response('Only PDF files are allowed', { status: 400, headers: corsHeaders })
    }

    // Validar tamaño del archivo (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      return new Response('File too large (max 5MB)', { status: 400, headers: corsHeaders })
    }

    // Verificar que la solicitud existe y pertenece a la compañía del HR
    const { data: timeoffRequest, error: timeoffError } = await supabase
      .from('timeoffs')
      .select('id, company_id')
      .eq('id', requestId)
      .single()

    if (timeoffError || !timeoffRequest) {
      return new Response('Timeoff request not found', { status: 404, headers: corsHeaders })
    }

    // Generar nombre único para el archivo
    const fileExt = fileName.split('.').pop()
    const uniqueFileName = `compensatory-physical-${requestId}-${Date.now()}.${fileExt}`

    // Subir archivo al bucket privado
    const { error: uploadError } = await supabase.storage
      .from('private-documents') // Bucket privado
      .upload(`compensatory/${uniqueFileName}`, file, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return new Response('Failed to upload file', { status: 500, headers: corsHeaders })
    }

    // Actualizar la solicitud con la referencia del archivo
    const { error: updateError } = await supabase
      .from('timeoffs')
      .update({
        physical_document_path: `compensatory/${uniqueFileName}`,
        physical_document_name: fileName,
        physical_document_uploaded_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (updateError) {
      console.error('Update error:', updateError)
      // Intentar eliminar el archivo subido si falla la actualización
      await supabase.storage
        .from('private-documents')
        .remove([`compensatory/${uniqueFileName}`])

      return new Response('Failed to update request', { status: 500, headers: corsHeaders })
    }

    return new Response(JSON.stringify({
      success: true,
      path: `compensatory/${uniqueFileName}`,
      name: fileName
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    })
  }
})