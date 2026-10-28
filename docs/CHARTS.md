# Charts

Charts live in `src/components/charts/` and are imported from one place:

```js
import { BalanceChart, DonutChart } from '../../components/charts';
```

Library: **react-native-gifted-charts** (draws with react-native-svg). Two shapes the library doesn’t have
(progress ring, segmented gauge) are drawn by hand with react-native-svg in `Rings.js`.

Every chart receives **plain arrays** from the API and a `width`. Screens compute the width with
`useWindowDimensions()` so charts fit any phone.

| Component | Type | Data shape | Data source | Screen |
|---|---|---|---|---|
| `BalanceChart` | Area line, curved, touch tooltip | `[{ label, balance }]` | `api.getBalanceSeries(range)` | Dashboard |
| `DonutChart` | Donut with centre label | `[{ value, color }]` | `getDashboard().incomeBreakdown` | Dashboard |
| `SimpleBarChart` | Bars with value on top | `[{ label, value, color? }]` | `getDashboard().team.byLevel` | Dashboard |
| `CashFlowChart` | Bars above/below zero | `[{ label, income, deposits, out }]` | `api.getCashFlow(8)` | Dashboard |
| `StackedBarChart` | Stacked bars | `rows: [{ label, roi, direct, level }]`, `series: [{ key, color }]` | `getEarnings().daily` | Earnings |
| `ScheduleChart` | Two lines: dashed scheduled + gold posted area | `scheduled`, `posted`: `[{ day, value }]` | `api.getPackageSchedule(pkg)` / `getIllustrativeSchedule()` | My packages, Explore |
| `ProgressRing` | Circle progress (SVG) | `progress` 0..1 | `getEarnings().bySource` | Earnings |
| `SegmentGauge` | Half-circle, N segments (SVG) | `filled`, `total` | `getLevels().unlocked` | Levels |
| `Legend` | Coloured labels | `[{ label, color, dashed? }]` | — | under charts |

## Colours

Series colours come from the theme so charts match the UI:

| Meaning | Colour |
|---|---|
| Package ROI / money in / posted | `colors.gold` `#E3B96E` |
| Direct commission | `colors.goldDeep` `#B98B45` |
| Level income | `colors.info` `#6E8BC9` |
| Money out | `colors.warning` `#F2A65A` |
| Scheduled / empty | `colors.subtle`, `colors.line` |

## Adding a new chart

1. Create `src/components/charts/MyChart.js`:
   ```js
   import { LineChart } from 'react-native-gifted-charts';
   export default function MyChart({ points, width }) {
     return <LineChart data={points.map(p => ({ value: p.y, label: p.x }))} width={width - 40} color={colors.gold} />;
   }
   ```
2. Export it from `charts/index.js`.
3. Return the points from an API function in `services/api.js` (keep calculations out of the component).
4. Use it in a screen: `<MyChart points={data.points} width={width - 40} />`.

Gifted-charts docs (props for LineChart / BarChart / PieChart): https://gifted-charts.web.app
