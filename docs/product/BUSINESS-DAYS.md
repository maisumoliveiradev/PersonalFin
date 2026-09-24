# BUSINESS-DAYS.md

Business-day rules used by recurrence adjustment (FR-043, FR-044
foundation, SDD-017). Source of truth in code:
`packages/domain/src/business-days.ts`.

## Business day

A calendar date that is neither a Saturday or Sunday nor a Brazilian
national holiday.

## Brazilian national holidays

| Date | Holiday |
|---|---|
| 1 January | Confraternização Universal |
| Easter Sunday − 2 days | Paixão de Cristo (Good Friday) |
| 21 April | Tiradentes |
| 1 May | Dia do Trabalho |
| 7 September | Independência do Brasil |
| 12 October | Nossa Senhora Aparecida |
| 2 November | Finados |
| 15 November | Proclamação da República |
| 20 November (from 2024) | Dia Nacional de Zumbi e da Consciência Negra |
| 25 December | Natal |

Easter is computed with the Gregorian computus. Carnival and Corpus
Christi are optional points, not national holidays, and are business
days in this foundation.

## Adjustment rules

| Rule | Behavior on a non-business day |
|---|---|
| `keep` | Keep the scheduled date. |
| `previous` | Move back to the closest earlier business day. |
| `next` | Move forward to the closest later business day. |

## Not yet supported

State and municipal holidays, which depend on a configured locality
(FR-044).
