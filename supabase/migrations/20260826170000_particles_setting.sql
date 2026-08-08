-- Founder toggle for the ambient particle/spark effect layered above the
-- app background (independent of whether a background image/color is
-- set) — mobile/components/ui/ParticlesLayer.tsx.
alter table public.founder_settings add column if not exists particles_enabled boolean not null default true;
