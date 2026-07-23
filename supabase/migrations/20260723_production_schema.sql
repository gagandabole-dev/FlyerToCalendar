-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    event_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'paid', 'bypass')),
    flyer_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create schedules table
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    room TEXT,
    artist TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'flyer_upload', 'ics_export', 'organizer_signup')),
    project_id UUID REFERENCES public.projects (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Public read projects" ON public.projects
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON public.projects
    FOR UPDATE USING (auth.uid() = user_id OR auth.jwt() ->> 'email' = 'gagan.dabole@gmail.com')
    WITH CHECK (auth.uid() = user_id OR auth.jwt() ->> 'email' = 'gagan.dabole@gmail.com');

CREATE POLICY "Users can delete their own projects" ON public.projects
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for schedules
CREATE POLICY "Public read schedules" ON public.schedules
    FOR SELECT USING (true);

CREATE POLICY "Users can insert schedules for their own projects" ON public.schedules
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = schedules.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update schedules for their own projects" ON public.schedules
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = schedules.project_id
            AND projects.user_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = schedules.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete schedules for their own projects" ON public.schedules
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = schedules.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- RLS Policies for analytics_events
CREATE POLICY "Public can insert analytics events" ON public.analytics_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can view all analytics events" ON public.analytics_events
    FOR SELECT USING (
        auth.jwt() ->> 'email' = 'gagan.dabole@gmail.com'
    );
