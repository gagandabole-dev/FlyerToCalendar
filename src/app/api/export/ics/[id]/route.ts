import { NextResponse } from 'next/server';
import { generateRFC5545Calendar } from '@/lib/ical';
import { supabase } from '@/lib/supabaseClient';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: project } = await supabase.from('projects').select('*').eq('id', id).single();
  const { data: schedules } = await supabase.from('schedules').select('*').eq('project_id', id);

  const icalContent = generateRFC5545Calendar(project?.event_name || 'Event', schedules || []);

  return new NextResponse(icalContent, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${project?.event_name || 'event'}.ics"`,
    },
  });
}
