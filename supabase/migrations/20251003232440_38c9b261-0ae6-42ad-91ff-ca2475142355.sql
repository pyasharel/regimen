-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Compounds table
CREATE TABLE public.compounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  name VARCHAR(255) NOT NULL,
  vial_size DECIMAL(10,2),
  vial_unit VARCHAR(10),
  bac_water_volume DECIMAL(10,2),
  intended_dose DECIMAL(10,2) NOT NULL,
  dose_unit VARCHAR(10) NOT NULL,
  calculated_iu DECIMAL(10,2),
  schedule_type VARCHAR(50) NOT NULL,
  schedule_days TEXT[],
  time_of_day TEXT[] NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  has_cycles BOOLEAN DEFAULT FALSE,
  cycle_weeks_on INTEGER,
  cycle_weeks_off INTEGER,
  has_titration BOOLEAN DEFAULT FALSE,
  titration_config JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Doses table (auto-generated from compounds)
CREATE TABLE public.doses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  compound_id UUID REFERENCES public.compounds(id) ON DELETE CASCADE,
  user_id UUID,
  scheduled_date DATE NOT NULL,
  scheduled_time VARCHAR(50) NOT NULL,
  dose_amount DECIMAL(10,2) NOT NULL,
  dose_unit VARCHAR(10) NOT NULL,
  calculated_iu DECIMAL(10,2),
  taken BOOLEAN DEFAULT FALSE,
  taken_at TIMESTAMP,
  skipped BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Progress entries table
CREATE TABLE public.progress_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category VARCHAR(50) NOT NULL,
  metrics JSONB,
  photo_url VARCHAR(500),
  ai_analysis JSONB,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.compounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_entries ENABLE ROW LEVEL SECURITY;

-- For now, allow public access (we'll add auth later per spec's delayed optional login)
CREATE POLICY "Allow public access to compounds" ON public.compounds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to doses" ON public.doses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to progress" ON public.progress_entries FOR ALL USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_doses_scheduled_date ON public.doses(scheduled_date);
CREATE INDEX idx_doses_compound_id ON public.doses(compound_id);
CREATE INDEX idx_progress_entries_date ON public.progress_entries(entry_date);
CREATE INDEX idx_compounds_user_id ON public.compounds(user_id);
CREATE INDEX idx_doses_user_id ON public.doses(user_id);
CREATE INDEX idx_progress_user_id ON public.progress_entries(user_id);