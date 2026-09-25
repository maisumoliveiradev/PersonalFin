# v0.5.0 --- Analytics

Drafted by the AI agent on 2026-09-25 under the project owner's
delegation, from `ROADMAP.md` (v0.5.0), FR-032, FR-061 to FR-068,
DR-013, and DR-066/DR-067. Domain decisions the documents left open are
listed here for owner review.

## Sequence

1.  `SDD-029-tags.md`
2.  `SDD-030-evolution-and-comparisons.md`
3.  `SDD-031-category-and-tag-analytics.md`
4.  `SDD-032-dashboard-personalization.md`
5.  `SDD-033-release-validation.md`

## Decisions for owner review

-   **Tags come first:** tag analytics (roadmap) needs tags (FR-032),
    which no earlier release delivered, so SDD-029 introduces them.
-   **Tag model:** tags belong to a space; names are unique per space
    ignoring case (1--40 characters). A transaction has at most 10 tags.
    Used tags are archived instead of deleted; never-used tags may be
    deleted. Tags never split the amount (DR-013): a transaction counts
    in full under each of its tags, so tag totals may add up to more
    than the period total. Recurrence series and installment purchases
    do not carry tags in this release; tags are set per transaction.
-   **Evolution (FR-061):** month-by-month realized income, expenses,
    and net (M-001 to M-003) plus the observed balance at each month end
    (M-007), for up to 24 months, using the existing metric rules (card
    purchases by invoice month).
-   **Comparisons (FR-063):** the selected month against the previous
    month and the same month of the previous year, for M-001 to M-005:
    absolute difference in minor units and percentage change. The
    percentage is null when the base is zero and is rounded for display
    only; stored and compared values stay exact.
-   **Category and tag analytics:** realized expenses of a month range
    by category (with subcategories) and by tag, with share of the
    period total and the same breakdown for the previous range of equal
    length. New metrics are added to `METRICS.md` (metric catalog).
-   **Personalization (FR-062, FR-067):** each user chooses, per space,
    an experience profile --- Basic (balance and realized summary),
    Intermediate (adds forecast, projection, and commitments link;
    default), or Advanced (adds projection series, comparisons, and
    analytics links) --- and may hide or show individual dashboard
    sections on top of the profile. Onboarding recommendation (FR-068)
    and custom metrics (FR-065) are left for later.
-   **No chart library:** evolution and breakdowns are shown as
    accessible lists with proportional bars drawn with plain views; a
    chart dependency is not justified yet.

## Out of scope for v0.5.0

Custom metrics and expressions, cross-space dashboards, exports, charts
with a third-party library, onboarding profile recommendation.
