# Contrappose

3D stylized drawing mannequin & posing studio with customizable chibi proportions, joint limits, and line-art export.
Built with Vite, React 19, TypeScript, Three.js (+ `three-stdlib` controls), Zustand and Tailwind CSS v4. See [`SPEC.md`](./SPEC.md) for the product specification.

## Getting started

```bash
npm install
npm run dev       # local dev server
npm run build     # type-check (tsc -b) + production build
npm run lint      # ESLint
npm run preview   # serve the production build
```

## Using the studio

- **Pose:** click any body part (or pick a joint in the right panel) to attach a rotation gizmo. Drag the rings, or use the pitch/yaw/roll sliders in the Joint Inspector. Press `Esc` to deselect.
- **Proportions:** the left panel scales the figure from a 2-head ultra chibi to a 7.5-head human; torso, limb, hand and foot sliders layer on top. Double-click any slider to reset it.
- **Limits:** *Enforce Anatomical Limits* clamps every joint to its range of motion (hinge knees/elbows 0–145°, ball joints on three axes). Turn it off for extreme stylized poses.
- **Debug:** *Show Joint Axes* draws an axes helper on every pivot (red X = pitch, green Y = yaw, blue Z = roll).
- **Shading:** Clay, Toon (stepped cel shading + outlines) and Line Art (inverted-hull outlines on white).
- **Camera:** orbit / pan / zoom with damping. The FOV slider dollies the camera to keep framing, from near-flat 8° to wide 100° foreshortening.
- **Export:** *PNG 4K* renders a transparent PNG (3840 px on the long edge, helpers hidden). *JSON* exports a ROS/URDF-compatible pose document; the upload button re-imports it.

## Project layout

```
src/
  components/canvas/   StudioScene (renderer, camera, controls, picking, export), MannequinRig, materials, lighting
  components/ui/       Top bar, proportion panel, pose presets, joint inspector, camera bar, export toolbar
  store/               Zustand store: proportions, joint rotations, display settings
  constants/           Joint hierarchy + ROM limit tables, pose presets, proportion slider definitions
  lib/                 Proportion engine, rotation clamping, JSON/URDF exporters
```

## Rig conventions

- Bone names follow VRM 1.0 humanoid naming (`hips`, `spine`, `chest`, `neck`, `head`, `leftShoulder`, `leftUpperArm`, …).
- Each joint is a `THREE.Group` pivot placed under a static *socket* group (`leftHip`, `leftShoulderSocket`, …) that holds the bone offset and rest orientation. Meshes are children of the pivot, offset so rotation happens at the joint.
- Rotations are local Euler angles, order `XYZ`. Every limb points down its local −Y; the arm sockets carry a fixed rest frame so that +X pitch is flexion for both knees and elbows. Right-side limits and poses are mirrors of the left (yaw/roll negated).
- Rest pose (all zeros) is the VRM T-pose.

## Pose JSON format

The export contains:

- `robot`: URDF-style `links` and `joints` (origin `xyz`/`rpy`, `axis`, `limit` in radians). Ball joints are expanded into chained revolute joints `<name>_pitch → _yaw → _roll`, which reproduce the rig's XYZ Euler order exactly; hinges are single revolute joints.
- `joint_state`: a `sensor_msgs/JointState`-shaped block (`name[]`, `position[]` in radians).
- `contrappose`: the raw degree rotations, root lift and proportions for lossless re-import.
