-- Create custom enum type for flyer processing status
CREATE TYPE public.processing_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Create public.flyers table
CREATE TABLE public.flyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    status public.processing_status NOT NULL DEFAULT 'pending',
    raw_json_output JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create public.calendar_events table
CREATE TABLE public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flyer_id UUID NOT NULL REFERENCES public.flyers (id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    artist TEXT,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    track_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.flyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public.flyers
CREATE POLICY "Users can view their own flyers" 
    ON public.flyers 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flyers" 
    ON public.flyers 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flyers" 
    ON public.flyers 
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flyers" 
    ON public.flyers 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Create RLS policies for public.calendar_events
CREATE POLICY "Users can view calendar events of their own flyers" 
    ON public.calendar_events 
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.flyers 
            WHERE flyers.id = calendar_events.flyer_id 
            AND flyers.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert calendar events of their own flyers" 
    ON public.calendar_events 
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.flyers 
            WHERE flyers.id = calendar_events.flyer_id 
            AND flyers.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update calendar events of their own flyers" 
    ON public.calendar_events 
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.flyers 
            WHERE flyers.id = calendar_events.flyer_id 
            AND flyers.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.flyers 
            WHERE flyers.id = calendar_events.flyer_id 
            AND flyers.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete calendar events of their own flyers" 
    ON public.calendar_events 
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.flyers 
            WHERE flyers.id = calendar_events.flyer_id 
            AND flyers.user_id = auth.uid()
        )
    );
