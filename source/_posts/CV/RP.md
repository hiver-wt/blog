---
title: RP
date: 2025-10-31 17:26:10
tags: CV;CG;XR
categories: XR
description: Record My Research Proposal
mathjax: true
password: WT0101
abstract: 这篇文章已加密，输入密码后查看全文。
message: 请输入访问密码：
---

**Scene Graph-Driven Text-to-3D Generation for XR**  
（基于场景图空间推理的XR环境文本生成研究）

---
Pipline: Text → Scene Graph → Layout Solver → Layout-based Preview → 3D Scene Assembly

## 1️⃣ Introduction
- **研究背景**：
    - 当前生成式3D（如 MagicCraft）主要关注单个物体生成 → 缺乏对多物体场景语义关系和空间约束的建模。
    - XR/MR应用中，虚拟场景的交互性和空间合理性是用户体验的关键。
    - 现有 LLM 难以处理三维空间推理（orientation, position, motion）。
- **研究目标**：
    - 基于 Scene Graph，结合布局求解（Layout Solver），实现文本到三维场景的生成。
    - 提供 **Layout-based Preview** 保证场景生成的语义和空间一致性。
    - 方案可扩展到多物体、交互式XR环境。
- **创新点**：
    1. 引入 Scene Graph + Layout Solver 的显式语义-空间映射；
    2. 利用布局预览提升语义与三维场景的一致性；
    3. 在有限数据与可行性条件下实现可控的多物体3D生成。

## 2️⃣ Related Work
 (1) Text-to-3D / Generative XR
- MagicCraft: Text → Image → 3D Model + Scripts；优点：用户可控制单物体生成；缺点：多物体场景与行为表现欠佳。
- DreamFusion、TripoSR、Shap-E：Text-to-3D模型基础，适用于单物体生成。
 (2) Scene Graph / Spatial Reasoning
- Scene Graph 用于语义化场景建模（对象 + 关系 +属性）；
- Scene Layout Optimization / Physics-based layout：用于位置/方向求解，保证物理合理性。
(3) Multi-object Scene Generation / 3D Reconstruction
- Text-to-Scene：SceneCraft, 3D-AbstractScenes
- 空间一致性优化与多物体交互约束。

## 3️⃣ Research Methodology
**Step 1: Scene Graph Generation**
- 输入：文本描述（Text）
- 方法：调用 LLM（GPT-4 或 LLaVA）解析对象关系 → 输出三元组 `(object, relation, target)`
- 输出：Scene Graph (JSON 或 Graph 数据结构)：
	- - **阶段1（可行性验证）**：
	    - 直接用 JSON 格式生成 Scene Graph
	    - 先不处理复杂属性或动态关系
	- **阶段2（优化）**：
	    - 转成 Graph 数据结构方便布局算法操作
	    - 可以做路径推理、关系传播、碰撞检测
```json
{
  "objects": [
    {"id": "o1", "name": "cup", "color": "red"},
    {"id": "o2", "name": "table", "material": "wood"},
    {"id": "o3", "name": "laptop"}
  ],
  "relations": [
    {"subject": "o1", "predicate": "on", "object": "o2"},
    {"subject": "o1", "predicate": "near", "object": "o3"}
  ]
}
```
```python
import networkx as nx
G = nx.DiGraph()
for obj in json["objects"]:
    G.add_node(obj["id"], **obj)
for rel in json["relations"]:
    G.add_edge(rel["subject"], rel["object"], relation=rel["predicate"])
```
**Step 2: Layout Solver**
- 输入：Scene Graph
- 方法：
    1. 将语义关系转化为空间约束（on → z对齐，near → x/y距离，behind →相机方向等）；
    2. Rule-based solver 或轻量物理模拟求解物体位置、方向和缩放；
**方法1：Rule-based Solver（简单可行）**
1. 遍历 Scene Graph 的每个对象和关系
2. 根据关系和属性计算候选位置
3. 检查物体是否冲突（简单的 AABB 碰撞检测）
4. 如有冲突 → 调整位置（偏移或旋转）
> 适合硕士阶段，易于实现，稳定且可解释

**方法2：物理模拟/优化**
5. 将 Scene Graph 转换为约束方程：
	- `f(position, rotation) = 0` 约束满足对象关系
6. 使用优化器（如梯度下降、CSP求解器）求解
7. 可加入轻量物理模拟（如 Unity physics）
8. 输出最优 `(x, y, z, rotation, scale)`
> 创新性更高，但实现难度大，训练数据需求高
- 输出：每个对象的 `(x, y, z, rotation, scale)`
```json
{
  "objects": [
    {
      "id": "o1",
      "name": "cup",
      "position": [1.2, 0.0, 0.75],
      "rotation": [0, 0, 0],
      "scale": [0.1, 0.1, 0.1]
    },
    {
      "id": "o2",
      "name": "table",
      "position": [0, 0, 0],
      "rotation": [0, 0, 0],
      "scale": [1.0, 1.0, 0.7]
    }
  ]
}
```
```python
# graph
G.nodes["cup"]["position"] = [1.2, 0.0, 0.75]
G.nodes["cup"]["rotation"] = [0, 0, 0]
G.nodes["cup"]["scale"] = [0.1, 0.1, 0.1]

```
**Step 3: Layout-based Preview**
- 输入：Layout Solver 输出
- 方法：使用 Unity / Open3D / PyRender 渲染低模或box-level场景图像
- 作用：用户可验证布局和语义是否一致，确保后续3D生成可控
**Step 4: 3D Scene Assembly**
- 输入：Layout Solver 输出 + Scene Graph
- 方法：
    1. 对每个 object 调用 text-to-3D 模型生成 mesh 或检索现有模型库（ShapeNet/Objaverse）；
    2. 根据 layout solver 的位置组合场景；
    3. 可选：加入简单物理碰撞/交互逻辑
- 输出：完整的 3D Scene，可导入 XR/MR 应用

## 4️⃣ Expected Results
1. 可控多物体3D场景生成（Text → Scene）
2. Layout-driven Preview 提供语义和空间一致性验证
3. 场景生成与原文本语义高度匹配
4. 对未来XR/MR应用的可扩展性与交互支持
## 🔗 Recommended References / Papers
**Text-to-3D / Generative Models**
1. MagicCraft: “MagicCraft: Natural Language-Driven Generation of Dynamic and Interactive 3D Objects for Commercial Metaverse Platforms”, Kurai et al., 2025
2. DreamFusion: “DreamFusion: Text-to-3D using 2D Diffusion”, Poole et al., NeurIPS 2022
3. TripoSR: “Tri-plane-based 3D Scene Reconstruction and Text-to-3D”, Xu et al., CVPR 2023
### **Scene Graph & Layout**
4. Scene Graphs: Johnson et al., “Image Retrieval using Scene Graphs”, CVPR 2015
5. 3D Scene Graph: Armeni et al., “3D Scene Graph: A Structure for Unified Semantics, 3D Space, and Cameras”, CVPR 2019
6. Layout Optimization: Yu et al., “Physical Reasoning for 3D Scene Generation”, SIGGRAPH 2021
**XR / Spatial Reasoning**
7. SceneCraft: “SceneCraft: Generative Text-to-Scene via Graph Representation”, 2024
8. Spatial Language & LLMs: Shwartz et al., “Learning Spatial Language with Neural Models”, ACL 2023


3.2 语义关系
属性也可转化约束：
- size → scale范围
- orientation → rotation约束

| 关系                | 对应约束       |
| ----------------- | ---------- |
| on                | z坐标对齐，顶面接触 |
| near              | xy平面距离范围   |
| above / below     | z坐标差距 > 0  |
| behind / in front | 相机视角方向约束   |
| left / right      | xy偏移方向     |
