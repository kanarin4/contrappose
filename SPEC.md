# Contrappose — 3D Stylized Drawing Mannequin & Proportions Studio

## 1. Project Overview
Contrappose is a high-performance, browser-based 3D stylized drawing mannequin and posing studio built with **Vite + React + TypeScript + Three.js + Tailwind CSS**.
Unlike traditional rigid 8-head realistic mannequins, Contrappose specializes in **chibi (2-3 head), stylized anime, and cartoon proportions** with interactive joint controls, anatomical range-of-motion (ROM) limiters, perspective camera foreshortening, and transparent line-art PNG export for digital illustrators.

---

## 2. Tech Stack & Architecture
- **Framework:** React 18/19 + Vite + TypeScript
- **3D Engine:** Three.js (`three`, `@types/three`), `three-stdlib` (for `TransformControls` and `OrbitControls`)
- **State Management:** Zustand (for reactive proportion state and joint transforms)
- **Styling:** Tailwind CSS (Dark slate studio aesthetic: `#090a0f`, `#131620`, `#3b82f6` accents)
- **Icons:** `lucide-react`

---

## 3. Core Technical Specifications

### A. Procedural 3D Stylized Rig (VRM 1.0 Hierarchy)
- Build the mannequin entirely using clean procedural Three.js primitives (`CapsuleGeometry`, `SphereGeometry`, `CylinderGeometry`) with beveled joints.
- **Strict Pivot Architecture:** Every joint must be a `THREE.Group` acting as the rotation pivot point. Meshes must be child nodes translated so rotations occur strictly at joint sockets, not the geometry center.
- **Bone Hierarchy:**
  ```
  Root (Pelvis)
   ├── Spine -> Chest
   │    ├── Neck -> Head (Scaled by Head Ratio slider)
   │    ├── Left Shoulder -> Left Upper Arm -> Left Lower Arm -> Left Hand
   │    └── Right Shoulder -> Right Upper Arm -> Right Lower Arm -> Right Hand
   ├── Left Hip -> Left Upper Leg -> Left Lower Leg -> Left Foot
   └── Right Hip -> Right Upper Leg -> Right Lower Leg -> Right Foot
  ```

### B. Mii-Maker Style Dynamic Proportion Engine
Real-time reactive sliders that dynamically scale meshes and update bone offset translations:
1. **Head-to-Body Ratio:** `2.0` (Ultra Chibi) to `4.0` (Cute Anime) to `7.5` (Standard Human).
2. **Torso Dimensions:** Length and Width modifiers.
3. **Limb Proportion:** Length multiplier and Thickness (Chubby vs Slim capsule radius).
4. **Hand & Foot Scale:** Exaggeration sliders for cartoon/stylized aesthetics.

### C. Joint Posing & Range of Motion (ROM) Limiters
- Click on any joint in the 3D viewport to attach `TransformControls` in **Rotation mode**.
- Implement local Euler angle clamping:
  - **Knees / Elbows (Hinge):** 1-DOF pitch clamping (0° to 145°, prevents unnatural backward knee bends).
  - **Neck / Spine / Shoulders (Ball-and-Socket):** 3-DOF pitch, yaw, roll clamps based on anatomical limits.
- **Toggle:** `[x] Enforce Anatomical Limits` (allows users to unclamp for extreme anime foreshortening poses).

### D. Visual Debugging Mode
- `[ ] Show Joint Axes` toggle: Renders `THREE.AxesHelper` (Red = X, Green = Y, Blue = Z) on all joints for easy visual orientation checks.
- Live Joint Angle Inspector: Displays active joint pitch/yaw/roll values in real-time.

### E. Artist Tools, Shading & Export
- **Shading Modes:**
  1. *Clay / MatCap:* Soft studio lighting with clean ambient shadows.
  2. *Toon / Cel-shaded:* Stepped brightness for clean comic reference.
  3. *Line-Art Outlines:* Inverted hull outline pass for direct sketching/tracing.
- **Camera Controls:**
  - Orbit, Pan, Zoom with smooth damping.
  - Camera FOV slider (Perspective distortion / dramatic foreshortening vs flat Isometric).
- **Preset Poses:** T-Pose, Cute Sit, Dynamic Jump, Standing Hero, Floating, Perspective Kick.
- **1-Click 4K Export:** Download transparent high-res PNG (`canvas.toBlob('image/png')`).
- **Pose Data Export:** 1-Click JSON export of joint angles in ROS/URDF compatible format.

---

## 4. Quality & Build Checklist
- Ensure `npm run build` succeeds with **zero TypeScript or lint errors**.
- Responsive layout with collapsible tool panels on mobile/desktop.
- Clean code structure:
  - `/src/components/canvas/` (Three.js viewport, rig, lighting, controls)
  - `/src/components/ui/` (Proportion sliders, pose presets, export toolbar)
  - `/src/store/` (Zustand store for mannequin state, proportions, joint rotations)
  - `/src/constants/` (Joint limit tables, preset poses data)
