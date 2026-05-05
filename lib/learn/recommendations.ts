import type { UserProfile, LanguageLevel } from "@/types/engine";

/**
 * Profile-aware German-learning path picker.
 *
 * The recommendations split by:
 *   - what their visa lets them subsidise (BAMF Integrationskurs eligibility),
 *   - how much time they realistically have (employed vs freelance vs student),
 *   - their starting level.
 *
 * No links break Resend's reputation — every URL is the official site.
 */

export interface LearnPath {
  id: string;
  title: string;
  blurb: string;
  url: string;
  effortLabel: string; // e.g. "20–30 min/day"
  costLabel: string; // e.g. "Free" or "€2.94/h"
  recommended: boolean;
}

const LEVEL_ORDER: LanguageLevel[] = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"];

export function levelGap(from?: LanguageLevel, to?: LanguageLevel): number {
  const f = from ? LEVEL_ORDER.indexOf(from) : 0;
  const t = to ? LEVEL_ORDER.indexOf(to) : LEVEL_ORDER.indexOf("B1");
  return Math.max(0, t - f);
}

export function pickPaths(profile: UserProfile): LearnPath[] {
  const paths: LearnPath[] = [];

  // BAMF Integrationskurs — eligible for most non-EU visa holders. Subsidised
  // and delivers A1→B1 over ~600 hours, plus a 100-hour orientation course.
  const bamfEligible =
    profile.visaType === "blue-card" ||
    profile.visaType === "work-permit" ||
    profile.visaType === "family-reunion" ||
    profile.visaType === "freelance-visa";

  if (bamfEligible) {
    paths.push({
      id: "bamf",
      title: "BAMF Integrationskurs",
      blurb:
        "State-subsidised in-person course (A1→B1). 600 language hours + 100 orientation hours. 50% refund on completion within 2 years. Typically your most cost-effective path to B1.",
      url: "https://www.bamf.de/EN/Themen/Integration/ZugewanderteTeilnehmende/Integrationskurse/integrationskurse-node.html",
      effortLabel: "20 h/week, ~6 months",
      costLabel: "€2.94/h (refundable)",
      recommended: true,
    });
  }

  // VHS evening courses — flexibility for working professionals, every city has one.
  paths.push({
    id: "vhs",
    title: "VHS evening course",
    blurb:
      "Volkshochschule (community college) offers German classes in the evenings and weekends. Cheaper than private schools, slower pace than Integrationskurs. Available in every German city.",
    url: "https://www.volkshochschule.de/",
    effortLabel: "4–6 h/week",
    costLabel: "€100–250 / level",
    recommended: !bamfEligible,
  });

  // Goethe-Institut — premium, highest credibility, English-supported.
  paths.push({
    id: "goethe",
    title: "Goethe-Institut",
    blurb:
      "Most internationally recognised German school. Intensive in-person or online. Best if you want a structured A1→C1 path and don't mind paying. Their certificates carry weight.",
    url: "https://www.goethe.de/en/spr/kup.html",
    effortLabel: "Intensive: 25 h/week",
    costLabel: "€350–800 / level",
    recommended: false,
  });

  // Deutsche Welle's Nicos Weg — free, self-paced, A1→B1.
  paths.push({
    id: "nicos_weg",
    title: "Deutsche Welle — Nicos Weg",
    blurb:
      "Free A1→B1 course from Germany's public broadcaster. Story-driven, 270+ short video lessons. The best zero-cost option, especially for daily 15-minute habits.",
    url: "https://learngerman.dw.com/en/overview",
    effortLabel: "15 min/day",
    costLabel: "Free",
    recommended:
      !bamfEligible && (profile.employment === "freelance" || profile.employment === "self-employed"),
  });

  // Tandem partner — peer practice. Sticky, free, social.
  paths.push({
    id: "tandem",
    title: "Tandem partners",
    blurb:
      "Pair with a German speaker who wants to learn your language. 30 min in each language, weekly. Best supplement to any structured course. Apps: Tandem, HelloTalk, ConversationExchange.",
    url: "https://www.tandem.net/",
    effortLabel: "1 h/week",
    costLabel: "Free",
    recommended: false,
  });

  return paths;
}

export interface ExamOption {
  id: string;
  name: string;
  level: LanguageLevel;
  cost: string;
  url: string;
  notes: string;
}

export function examsFor(level: LanguageLevel): ExamOption[] {
  return [
    {
      id: "telc",
      name: "telc Deutsch",
      level,
      cost: "€130–180",
      url: "https://www.telc.net/en/",
      notes:
        "Most widely accepted by German authorities for residency / citizenship. Slightly easier than Goethe at the same level.",
    },
    {
      id: "goethe_exam",
      name: "Goethe-Zertifikat",
      level,
      cost: "€180–250",
      url: "https://www.goethe.de/en/spr/kup/prf.html",
      notes:
        "Highest international recognition. Required for some scholarships and university admissions. Slightly harder than telc.",
    },
    {
      id: "oesd",
      name: "ÖSD",
      level,
      cost: "€110–160",
      url: "https://www.osd.at/en/",
      notes:
        "Austrian standard, recognised in Germany. Often cheaper and quicker to schedule than the others. Useful in border regions.",
    },
  ];
}
