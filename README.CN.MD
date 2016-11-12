# 泊地修理插件

[![npm package][npm-badge]][npm]


## 简介
泊地修理插件是辅助安排明石泊地修理的工具，功能有

- [x] 预计泊地修理用时
- [x] 泊地修理完成通知

## 限制
- 再改变泊地修理舰队的编成时，由于艦これ API 不会更新舰娘耐久，可能导致修理用时的预计错误。因此必须返回到母港界面来重新计时。

## 简要机制
### 入渠时间
基于损失耐久、等级与船类型的公式已经确认，这个值也在 API 的 *api_ndock_time* 中给出。

### 泊地修理要求
- 明石（或明石改）必须为舰队旗舰，耐久为小破以上，并且不处于入渠状态。
- 明石本身可以修理她自己以及二号位舰娘，每装备一个舰队修理设施，可以多修理一个位置的舰娘。
- 舰娘必须在小破（50% 的最大耐久）以上
- 舰娘未处于入渠状态

### 修理时间
- 需要至少 20 分钟来完成至少 1 格的耐久的回复
- 超过 20 分钟，回复量与入渠状态下的回复量一致，并向下取整
- 入渠时间公式中有 30 秒的额外时间，然而实际入渠过程会提前 1 分钟结束。修理时间则会**向上取整**到下一分钟。
- 修理计时器会被以下事件重置:
  - 返回母港画面
  - 改变修理舰队的编成
  - 使用高速修复材来进行入渠，普通入渠不会重置（目前插件不支持）
  - 使舰队参加远征

### 插件考虑范围之外的事件
以下情况，插件并未特别进行处理。因此结果可能会与所期望的不同
- 调整明石的装备，准确地说，调整舰队修理设施的数量
- 使舰队参加远征


# 参考资料
- <http://kancolle.wikia.com/wiki/Akashi#Anchorage_Repair>
- <http://kancolle.wikia.com/wiki/Docking#Repair_time>
- <http://wikiwiki.jp/kancolle/?%CC%C0%C0%D0#h2_content_1_1>
- <https://en.kancollewiki.net/wiki/Auxiliary_Ships_Mechanics>

# 授权许可
MIT

[npm-badge]: https://img.shields.io/npm/v/poi-plugin-anchorage-repair.svg?style=flat-square
[npm]: https://www.npmjs.org/package/poi-plugin-anchorage-repair