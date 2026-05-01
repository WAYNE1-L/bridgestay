# Pass A.5 验证清单 — Sublease UI 字段收纳

Branch: `feat/sublease-airbnb-model` (continuation; Pass A 还没 merge,所以本 pass 累加在同分支上)

```bash
cd app
npm run dev
# open http://localhost:5173/calculator/sublease
```

---

## 默认空状态

- [ ] PropertyCard 默认只显示 **6 个常用字段**:
  - Property nickname
  - Monthly rent to owner
  - Lease length
  - Peak ADR
  - Off-season ADR
  - Occupancy rate
- [ ] 看到一个 "▶ Advanced settings / 高级设置" 折叠按钮(箭头朝右),默认收起
- [ ] 顶部 4 张 KPI 卡 + Property comparison(2+ 套时)+ Sensitivity / Cashflow waterfall 图表都还在,样子跟 Pass A 完全一样
- [ ] 没看到 Setup cost / Revenue tuning / Lease details / Operating cost / Risk / Platform & tax 字段(它们在 Advanced 里)

## Advanced 展开

- [ ] 点 "Advanced settings / 高级设置",看到 6 个 section,顺序:
  1. **Setup cost / 一次性投入** — 4 个字段(furniture / renovation / deep clean / photography)
  2. **Revenue tuning / 收入参数微调** — Peak season 月份范围 + Avg nights / booking
  3. **Lease details / 合同细节** — Initial deposit + Deposit refundable
  4. **Operating cost / 月运营成本** — utilities + utilities-included toggle + cleaning + cleaning-passed toggle + supplies + maintenance + STR insurance
  5. **Risk / 风险** — Damage hold rate
  6. **Platform & tax / 平台与税** — Airbnb host fee + lodging tax toggle + (manual lodging tax when toggle off) + income tax
- [ ] 再点一次,Advanced 折回去

## Off-season ADR 自动推导

- [ ] 全空 PropertyCard:Peak ADR placeholder 是 `0`,Off ADR placeholder 也是 `0`,Off ADR 下面没有 hint 文字
- [ ] 在 Peak ADR 框输入 `90`(一次性输入完),Off-season ADR 自动变成 `50`(`round(90 × 0.56)`)
- [ ] Off-season ADR 输入框下方出现灰字 `Auto: ~$50 (56% of peak)`
- [ ] 把 Peak ADR 改成 `100`,Off ADR 自动跟着变成 `56`(因为前一个值是我们刚 auto-suggest 的,没被用户改过)
- [ ] 现在手工把 Off ADR 改成 `60`,把 Peak ADR 改成 `200` → Off ADR **保持 60**(用户改过了,不再被覆盖)
- [ ] 再把 Off ADR 清空成 `0`,改一下 Peak ADR(比如 `120`)→ Off ADR 自动变成 `67`(用户清空 = 重新启用 auto-suggest)

边界:
- [ ] Peak ADR = 0 → Off ADR 不会被推成 `0` 之类的奇怪值;hint 不显示

## Try example 按钮

- [ ] 点顶部 "Try example / 示例数据":
  - Essential 6 个字段同时填上(`SLC summer student sublet`、`800`、`3`、`90`、`50`、`70`)
  - Advanced **不会自动展开**(还是收起,但里面的值已经是 SLC preset)
  - Off-season ADR 显示 `50`(preset 自带,不是 auto-suggest 推的);hint 显示 `Auto: ~$50 (56% of peak)`(碰巧相等)
- [ ] KPI 立即更新:Total monthly net 在 $800 - $1,200 范围,Portfolio payback `Immediate`,3-mo total net 在 $2,400 - $3,500
- [ ] 展开 Advanced 看到:
  - Cleaning passed to guest: ✅
  - Utilities included in lease: ✅
  - Maintenance reserve `30`,STR insurance `20`
  - Income tax `22%`,Lodging tax handled by Airbnb ✅,Airbnb host fee `3%`
  - Peak season `May → Sep`,Avg nights `2`

## 多套 portfolio

- [ ] 点 "+ Add property",第二张 PropertyCard 出现,默认也是 Essential-only(Advanced 收起)
- [ ] 在第二张卡的 Peak ADR 输入 `120` → 它自己的 Off ADR 自动变成 `67`,不影响第一张卡
- [ ] 折叠第一张卡(点标题行)→ 只显示标题 + monthly net,Advanced toggle 也消失
- [ ] 删除第二张卡,只剩一张时 trash 图标变灰禁用

## 算法不变 / 回归

- [ ] 同样数据,Pass A 算出的 monthly net、payback、ROI 在 Pass A.5 完全相同
- [ ] `npx vitest run client/src/lib/calculator/sublease.test.ts` → 23/23 通过
- [ ] `/`、`/analytics/*`、`/calculator`(非 sublease) 都不受影响

## 视觉

- [ ] PropertyCard 收起 Advanced 时高度明显比 Pass A 短(3 行 essential 字段 vs. 之前 7 段堆叠)
- [ ] 多套 portfolio (2-3 张 card) 屏幕一眼能看到所有 card 的 essential
- [ ] Number input 没有 stepper 箭头(Pass C 工作保留)
- [ ] Tabular 数字对齐(Pass C 工作保留)
- [ ] 默认 0 显示 placeholder 而非字符 0(Pass C 工作保留)

---

如果任意一项失败,截图 + 浏览器 console 输出。算法层面 23 个 unit test 仍然在保护,失败大概率是 UI 状态没接好(Collapsible / useRef / 自动推导)。
