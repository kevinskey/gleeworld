-- Prayer module — the prayers themselves.
--
-- Phase 0 shipped the liturgical calendar and the Mass reading citations, which
-- is a lectionary, not a prayer app. This is the prayer library: the actual
-- texts a person prays.
--
-- PLATFORM REFERENCE DATA, same shape as the calendar tables: no tenant_id
-- (the Our Father does not vary by choir), readable by every authenticated
-- user, writable only by gw_is_platform_super_admin().
--
-- LICENSING — this is the whole reason the seed below looks the way it does.
-- Only long-settled public-domain English forms are used. Specifically
-- EXCLUDED, and they must stay excluded:
--   * the 2011 ICEL Roman Missal translations (the Gloria, Nicene Creed and
--     Mass ordinary as currently proclaimed) — ICEL copyright
--   * the Liturgy of the Hours — copyright held by the hierarchies of
--     Australia, England & Wales and Ireland
--   * the Divine Mercy Chaplet's English text — Marian Fathers
-- Where a modern translation is copyrighted, the traditional form is used and
-- source_note says so.

CREATE TABLE IF NOT EXISTS public.gw_prayer_texts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE,
  title        text NOT NULL,
  latin_title  text,
  -- Plain text. Blank line separates stanzas; the UI renders paragraphs.
  body         text NOT NULL,
  category     text NOT NULL
                 CHECK (category IN ('daily','marian','devotional','act','seasonal','canticle')),
  -- Optional hints so the UI can surface the right prayer at the right moment.
  time_of_day  text CHECK (time_of_day IN ('morning','midday','evening','night')),
  season       text,
  sort_order   int  NOT NULL DEFAULT 100,
  -- Provenance, shown in the UI. Never leave this null on a seeded prayer.
  source_note  text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_prayer_texts_category_idx
  ON public.gw_prayer_texts (category, sort_order);

ALTER TABLE public.gw_prayer_texts ENABLE ROW LEVEL SECURITY;

-- DROP-then-CREATE so the whole migration is re-runnable; a bare CREATE POLICY
-- errors on the second run.
DROP POLICY IF EXISTS gw_prayer_texts_read ON public.gw_prayer_texts;
CREATE POLICY gw_prayer_texts_read ON public.gw_prayer_texts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS gw_prayer_texts_admin_write ON public.gw_prayer_texts;
CREATE POLICY gw_prayer_texts_admin_write ON public.gw_prayer_texts
  FOR ALL TO authenticated
  USING (public.gw_is_platform_super_admin())
  WITH CHECK (public.gw_is_platform_super_admin());

-- ---------------------------------------------------------------------------
-- Seed. Idempotent: re-running updates the text rather than duplicating.
-- ---------------------------------------------------------------------------

INSERT INTO public.gw_prayer_texts
  (slug, title, latin_title, category, time_of_day, season, sort_order, source_note, body)
VALUES
  ('sign-of-the-cross', 'The Sign of the Cross', 'Signum Crucis', 'daily', NULL, NULL, 10,
   'Traditional English form; public domain.',
   'In the name of the Father, and of the Son, and of the Holy Spirit. Amen.'),

  ('our-father', 'The Our Father', 'Pater Noster', 'daily', NULL, NULL, 20,
   'Traditional English form; public domain. Not the 2011 Missal text.',
   'Our Father, who art in heaven, hallowed be thy name;
thy kingdom come; thy will be done on earth as it is in heaven.

Give us this day our daily bread;
and forgive us our trespasses as we forgive those who trespass against us;
and lead us not into temptation, but deliver us from evil. Amen.'),

  ('hail-mary', 'The Hail Mary', 'Ave Maria', 'marian', NULL, NULL, 30,
   'Traditional English form; public domain.',
   'Hail Mary, full of grace, the Lord is with thee.
Blessed art thou among women, and blessed is the fruit of thy womb, Jesus.

Holy Mary, Mother of God, pray for us sinners,
now and at the hour of our death. Amen.'),

  ('glory-be', 'The Glory Be', 'Gloria Patri', 'daily', NULL, NULL, 40,
   'Traditional English form; public domain.',
   'Glory be to the Father, and to the Son, and to the Holy Spirit;
as it was in the beginning, is now, and ever shall be, world without end. Amen.'),

  ('apostles-creed', 'The Apostles'' Creed', 'Symbolum Apostolorum', 'daily', NULL, NULL, 50,
   'Traditional English form; public domain. The Nicene Creed is deliberately omitted — its current English translation is under ICEL copyright.',
   'I believe in God, the Father almighty, Creator of heaven and earth;
and in Jesus Christ, his only Son, our Lord;
who was conceived by the Holy Spirit, born of the Virgin Mary,
suffered under Pontius Pilate, was crucified, died, and was buried.

He descended into hell; the third day he rose again from the dead;
he ascended into heaven, and sitteth at the right hand of God the Father almighty;
from thence he shall come to judge the living and the dead.

I believe in the Holy Spirit, the holy catholic Church, the communion of saints,
the forgiveness of sins, the resurrection of the body, and life everlasting. Amen.'),

  ('act-of-contrition', 'An Act of Contrition', NULL, 'act', NULL, NULL, 60,
   'Traditional English form; public domain.',
   'O my God, I am heartily sorry for having offended thee,
and I detest all my sins because of thy just punishments,
but most of all because they offend thee, my God,
who art all good and deserving of all my love.

I firmly resolve, with the help of thy grace,
to sin no more and to avoid the near occasions of sin. Amen.'),

  ('act-of-faith', 'An Act of Faith', NULL, 'act', NULL, NULL, 61,
   'Traditional English form; public domain.',
   'O my God, I firmly believe that thou art one God in three divine Persons,
Father, Son, and Holy Spirit; I believe that thy divine Son became man
and died for our sins, and that he will come to judge the living and the dead.

I believe these and all the truths which the holy Catholic Church teaches,
because thou hast revealed them, who canst neither deceive nor be deceived. Amen.'),

  ('act-of-hope', 'An Act of Hope', NULL, 'act', NULL, NULL, 62,
   'Traditional English form; public domain.',
   'O my God, relying on thy almighty power and infinite mercy and promises,
I hope to obtain pardon of my sins, the help of thy grace,
and life everlasting, through the merits of Jesus Christ, my Lord and Redeemer. Amen.'),

  ('act-of-love', 'An Act of Love', NULL, 'act', NULL, NULL, 63,
   'Traditional English form; public domain.',
   'O my God, I love thee above all things, with my whole heart and soul,
because thou art all good and worthy of all my love.

I love my neighbour as myself for the love of thee.
I forgive all who have injured me, and ask pardon of all whom I have injured. Amen.'),

  ('morning-offering', 'Morning Offering', NULL, 'daily', 'morning', NULL, 15,
   'Traditional English form; public domain.',
   'O Jesus, through the Immaculate Heart of Mary,
I offer thee my prayers, works, joys, and sufferings of this day,
for all the intentions of thy Sacred Heart,
in union with the Holy Sacrifice of the Mass throughout the world. Amen.'),

  ('anima-christi', 'Soul of Christ', 'Anima Christi', 'devotional', NULL, NULL, 70,
   'Traditional English translation of the 14th-century Latin hymn; public domain.',
   'Soul of Christ, sanctify me.
Body of Christ, save me.
Blood of Christ, inebriate me.
Water from the side of Christ, wash me.
Passion of Christ, strengthen me.

O good Jesus, hear me.
Within thy wounds hide me.
Suffer me not to be separated from thee.
From the malignant enemy defend me.
In the hour of my death call me,
and bid me come unto thee,
that with thy saints I may praise thee
for ever and ever. Amen.'),

  ('memorare', 'The Memorare', 'Memorare', 'marian', NULL, NULL, 80,
   'Traditional English form; public domain.',
   'Remember, O most gracious Virgin Mary,
that never was it known that anyone who fled to thy protection,
implored thy help, or sought thy intercession, was left unaided.

Inspired by this confidence, I fly unto thee,
O Virgin of virgins, my Mother.
To thee do I come; before thee I stand, sinful and sorrowful.
O Mother of the Word Incarnate, despise not my petitions,
but in thy mercy hear and answer me. Amen.'),

  ('salve-regina', 'Hail, Holy Queen', 'Salve Regina', 'marian', NULL, NULL, 85,
   'Traditional English translation of the 11th-century Latin antiphon; public domain.',
   'Hail, holy Queen, Mother of mercy,
our life, our sweetness, and our hope.

To thee do we cry, poor banished children of Eve;
to thee do we send up our sighs, mourning and weeping in this valley of tears.

Turn then, most gracious advocate, thine eyes of mercy toward us,
and after this our exile show unto us the blessed fruit of thy womb, Jesus.
O clement, O loving, O sweet Virgin Mary. Amen.'),

  ('angelus', 'The Angelus', 'Angelus Domini', 'marian', 'midday', NULL, 90,
   'Traditional English form; public domain. Prayed at morning, noon and evening.',
   'The Angel of the Lord declared unto Mary,
and she conceived of the Holy Spirit. — Hail Mary…

Behold the handmaid of the Lord.
Be it done unto me according to thy word. — Hail Mary…

And the Word was made flesh,
and dwelt among us. — Hail Mary…

Pray for us, O holy Mother of God,
that we may be made worthy of the promises of Christ.'),

  ('regina-caeli', 'Queen of Heaven', 'Regina Caeli', 'marian', NULL, 'EASTER', 95,
   'Traditional English translation; public domain. Replaces the Angelus during Eastertide.',
   'Queen of heaven, rejoice. Alleluia.
For he whom thou didst merit to bear. Alleluia.
Hath risen as he said. Alleluia.
Pray for us to God. Alleluia.

Rejoice and be glad, O Virgin Mary. Alleluia.
For the Lord hath risen indeed. Alleluia.'),

  ('st-michael', 'Prayer to Saint Michael', NULL, 'devotional', NULL, NULL, 100,
   'Leo XIII, 1886; traditional English form, public domain.',
   'Saint Michael the Archangel, defend us in battle.
Be our protection against the wickedness and snares of the devil.
May God rebuke him, we humbly pray;
and do thou, O Prince of the heavenly host,
by the power of God, thrust into hell Satan and all evil spirits
who prowl about the world seeking the ruin of souls. Amen.'),

  ('veni-sancte-spiritus', 'Come, Holy Spirit', 'Veni Sancte Spiritus', 'devotional', NULL, NULL, 105,
   'Traditional English form; public domain. Prayed before singing, study, or any work.',
   'Come, Holy Spirit, fill the hearts of thy faithful
and kindle in them the fire of thy love.

Send forth thy Spirit and they shall be created,
and thou shalt renew the face of the earth.

O God, who by the light of the Holy Spirit didst instruct the hearts of the faithful,
grant that by the same Spirit we may be truly wise
and ever rejoice in his consolation. Amen.'),

  ('prayer-of-st-francis', 'Prayer of Saint Francis', NULL, 'devotional', NULL, NULL, 110,
   'Anonymous, first printed in French in 1912; traditional English form, public domain. Attributed to St Francis by custom rather than authorship.',
   'Lord, make me an instrument of thy peace.
Where there is hatred, let me sow love;
where there is injury, pardon;
where there is doubt, faith;
where there is despair, hope;
where there is darkness, light;
where there is sadness, joy.

O divine Master, grant that I may not so much seek
to be consoled as to console;
to be understood as to understand;
to be loved as to love.

For it is in giving that we receive;
it is in pardoning that we are pardoned;
and it is in dying that we are born to eternal life. Amen.'),

  ('magnificat', 'The Magnificat', 'Magnificat', 'canticle', 'evening', NULL, 120,
   'Luke 1:46-55, World English Bible (Catholic Edition); public domain.',
   'My soul magnifies the Lord.
My spirit has rejoiced in God my Saviour,
for he has looked at the humble state of his servant.

For behold, from now on, all generations will call me blessed.
For he who is mighty has done great things for me.
Holy is his name.

His mercy is for generations of generations on those who fear him.
He has shown strength with his arm.
He has scattered the proud in the imagination of their hearts.
He has put down princes from their thrones,
and has exalted the lowly.
He has filled the hungry with good things.
He has sent the rich away empty.'),

  ('nunc-dimittis', 'Canticle of Simeon', 'Nunc Dimittis', 'canticle', 'night', NULL, 130,
   'Luke 2:29-32, World English Bible (Catholic Edition); public domain.',
   'Now you are releasing your servant, Master, according to your word, in peace;
for my eyes have seen your salvation,
which you have prepared before the face of all peoples;
a light for revelation to the nations,
and the glory of your people Israel.'),

  ('examen', 'The Daily Examen', NULL, 'daily', 'night', NULL, 140,
   'A summary of the Ignatian practice from the Spiritual Exercises (1548), written for this app. Not a quotation.',
   'Become still, and ask for God''s light on the day now ending.

Give thanks for what was good in it, however small.

Walk back through the hours. Where was God present? Where were you drawn
toward love, and where away from it?

Ask forgiveness for what went wrong, plainly and without excuse.

Look to tomorrow, and ask for the grace you will need. Amen.'),

  ('prayer-before-singing', 'Before Singing', NULL, 'devotional', NULL, NULL, 150,
   'Written for this app, drawing on the traditional prayer to St Cecilia.',
   'Lord, you have given us voices, and the breath to use them.

Let what we sing be true, and let it serve those who hear it
more than it serves our pride.

Saint Cecilia, patroness of musicians, pray for us,
that our music may be worthy of the One it praises. Amen.')

ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, latin_title = EXCLUDED.latin_title, body = EXCLUDED.body,
  category = EXCLUDED.category, time_of_day = EXCLUDED.time_of_day,
  season = EXCLUDED.season, sort_order = EXCLUDED.sort_order,
  source_note = EXCLUDED.source_note;

NOTIFY pgrst, 'reload schema';
