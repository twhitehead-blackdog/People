-- Policies para que usuarios autenticados puedan leer/escribir las tablas IT
-- desde la app de People. service_role_all sigue activo para backend.

-- Mobile Lines
CREATE POLICY "authenticated_select_it_mobile_lines" ON public.it_mobile_lines
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert_it_mobile_lines" ON public.it_mobile_lines
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_update_it_mobile_lines" ON public.it_mobile_lines
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_delete_it_mobile_lines" ON public.it_mobile_lines
  FOR DELETE USING (auth.role() = 'authenticated');

-- Software Licenses
CREATE POLICY "authenticated_select_it_software_licenses" ON public.it_software_licenses
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert_it_software_licenses" ON public.it_software_licenses
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_update_it_software_licenses" ON public.it_software_licenses
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_delete_it_software_licenses" ON public.it_software_licenses
  FOR DELETE USING (auth.role() = 'authenticated');

-- NVR Devices (read-only para authenticated)
CREATE POLICY "authenticated_select_it_nvr_devices" ON public.it_nvr_devices
  FOR SELECT USING (auth.role() = 'authenticated');

-- Camera status (read-only)
CREATE POLICY "authenticated_select_it_camera_status" ON public.it_camera_status
  FOR SELECT USING (auth.role() = 'authenticated');

-- IT Devices (full CRUD)
CREATE POLICY "authenticated_select_it_devices" ON public.it_devices
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert_it_devices" ON public.it_devices
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_update_it_devices" ON public.it_devices
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_delete_it_devices" ON public.it_devices
  FOR DELETE USING (auth.role() = 'authenticated');

-- Ticket comments: UPDATE
CREATE POLICY "authenticated_update_it_ticket_comments" ON public.it_ticket_comments
  FOR UPDATE USING (auth.role() = 'authenticated');
