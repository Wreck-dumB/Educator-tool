-- Extends developmental_milestones from 0-5 years up to 18, per request.
-- Adds a 'physical' domain - puberty/growth content for older bands doesn't
-- meaningfully fit "gross_motor"/"fine_motor" the way early-childhood motor
-- skills do, so a broader physical-development category is more honest than
-- force-fitting it.
--
-- New bands sourced from:
-- - 5-8 years, 9-12 years: Emerging Minds (National Workforce Centre for
--   Child Mental Health, Australian Government-funded) "Understanding child
--   development" series.
-- - 12-14 years, 15-18 years: HealthyChildren.org (American Academy of
--   Pediatrics) "Stages of Adolescence" - used because direct AU-specific
--   teen development sources (Raising Children Network) blocked automated
--   fetching; cross-checked against AU-sourced puberty-timing facts already
--   gathered (girls ~8-13, boys ~9-14 for onset). Cognitive/social-emotional
--   adolescent stages are broadly consistent across Western pediatric
--   guidance, unlike e.g. legal/regulatory content which must stay AU-specific.
-- Same "general guide, not diagnostic" caveat applies at every age.

alter table public.developmental_milestones drop constraint developmental_milestones_domain_check;
alter table public.developmental_milestones add constraint developmental_milestones_domain_check
  check (domain in ('gross_motor','fine_motor','language','social_emotional','cognitive','physical'));

insert into public.developmental_milestones (age_band, age_band_order, domain, milestone_text) values
-- 5-8 years
('5-8 years', 8, 'physical', 'Expected to have mastered foundational gross and fine motor skills for school participation'),
('5-8 years', 8, 'cognitive', 'Beginning to reliably see things from another person''s perspective'),
('5-8 years', 8, 'cognitive', 'Increasingly distinguishes between what is imaginary and what is real'),
('5-8 years', 8, 'cognitive', 'Developing logical thinking; asks specific questions about events'),
('5-8 years', 8, 'language', 'Uses developing language skills to lead imaginative play and interact socially'),
('5-8 years', 8, 'language', 'Asks lots of questions about the world around them'),
('5-8 years', 8, 'social_emotional', 'Becoming more interested in friendships; can name one or two friends'),
('5-8 years', 8, 'social_emotional', 'Learning to take turns and share, though this can break down under pressure'),
('5-8 years', 8, 'social_emotional', 'Beginning to develop an internalised sense of right and wrong'),

-- 9-12 years
('9-12 years', 9, 'physical', 'Onset of puberty becomes apparent for many children toward the end of this stage'),
('9-12 years', 9, 'cognitive', 'Still largely concrete thinkers but beginning to think in more abstract ways'),
('9-12 years', 9, 'cognitive', 'Shows stronger interest in facts, knowledge, and mastering skills'),
('9-12 years', 9, 'cognitive', 'Reliably distinguishes fact from fantasy'),
('9-12 years', 9, 'language', 'Increased verbal skill supports more complex conversations and problem-solving'),
('9-12 years', 9, 'social_emotional', 'Develops capacity to see things from another''s perspective with genuine empathy'),
('9-12 years', 9, 'social_emotional', 'Forms intense, exclusive best-friend relationships, often same-gender'),
('9-12 years', 9, 'social_emotional', 'Self-image becomes increasingly distinct and multi-dimensional'),
('9-12 years', 9, 'social_emotional', 'Growing awareness of family/cultural background and socioeconomic status'),

-- 12-14 years (early adolescence)
('12-14 years', 10, 'physical', 'Continues rapid puberty-related growth (e.g. breast/testicular development, body hair) - timing varies widely, typically beginning around age 8-13 for girls and 9-14 for boys'),
('12-14 years', 10, 'cognitive', 'Tends toward concrete, black-and-white thinking with developing abstract reasoning'),
('12-14 years', 10, 'cognitive', 'Strong self-consciousness about appearance; feels a sense of being watched or judged by peers'),
('12-14 years', 10, 'social_emotional', 'Increased need for privacy and independence from family'),
('12-14 years', 10, 'social_emotional', 'Beginning to explore identity, including gender identity'),
('12-14 years', 10, 'social_emotional', 'Peer relationships and approval become more influential'),

-- 15-18 years (middle-to-late adolescence)
('15-18 years', 11, 'physical', 'Most puberty-related physical changes are completing; adult height is typically reached by the late teens'),
('15-18 years', 11, 'cognitive', 'Developing the ability to think abstractly and consider the "big picture", though applying this under pressure is still maturing'),
('15-18 years', 11, 'cognitive', 'Improving impulse control and risk-reward judgement as the brain continues maturing into the 20s'),
('15-18 years', 11, 'social_emotional', 'Increasing interest in romantic/sexual relationships and identity exploration'),
('15-18 years', 11, 'social_emotional', 'Developing a stronger, more stable sense of individual values and identity'),
('15-18 years', 11, 'social_emotional', 'Friendships shift toward being based on shared trust, ideas, and feelings rather than just shared activities'),
('15-18 years', 11, 'social_emotional', 'Beginning to relate to parents in a more adult, peer-like way');
