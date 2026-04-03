# Dental Ops Platform UI Reset Reference

This file is the working reference for the UI and UX direction going forward.

The purpose is to stop incremental patching and keep the product aligned to one clear interface system.

## Core Diagnosis

The current UI problem is not backend functionality.

The main issue is that the interface has repeatedly drifted into:

- dark CRUD screens
- generic admin-template composition
- too many small cards and labels
- weak visual hierarchy
- overuse of dark rectangles
- pages that feel like data dumps instead of workflows

The shell may be acceptable, but the interior of the surfaces must be redesigned around product workflow, not field display.

## Product Surface Model

The app should be built around exactly three primary surfaces:

### 1. Console

Purpose:

- show what matters now
- surface urgency
- guide operators through action

Must contain:

- Morning brief
- Urgent queue
- Callback queue
- Operations feed
- Inline or drawer-based callback detail

Should feel like:

- an operator workspace
- high-signal
- action-first

Should not feel like:

- a spreadsheet
- an analytics page
- a generic dashboard template

### 2. Calls

Purpose:

- inspect source conversations
- review transcript and recording
- understand what generated callback and incident work

Must contain:

- call log
- highlighted or important calls section
- reliable access to transcript
- reliable access to recording
- linked callback and incident context

Should feel like:

- a workspace for reviewing call detail
- clean and readable

Should not feel like:

- a dense table dump
- a generic CRM record page

### 3. Setup

Purpose:

- prepare a practice to go live
- configure modules, integrations, and workflow behavior

Must contain:

- readiness or go-live view
- integrations view
- routing rules view
- practice profile context

Should feel like:

- a setup workspace
- clear, guided, and operational

Should not feel like:

- a settings graveyard
- a raw JSON admin panel

## What Was Objectively Wrong Before

### Layout problems

- no strong layout rhythm
- weak spacing system
- compressed content areas
- too much empty dead space in the wrong places

### Hierarchy problems

- urgent content and routine content looked too similar
- headers were too weak
- too many small labels before the content
- cards did not create momentum or visual flow

### Workflow problems

- too many sections felt like static records
- screens did not clearly answer:
  - what happened
  - what matters
  - what should I do next

### Visual problems

- muddy dark theme
- overuse of identical bordered boxes
- typography too flat
- insufficient contrast in emphasis areas
- not enough intentional density variation

## Visual Direction Going Forward

Use one intentional visual system.

### Tone

- modern operator product
- premium but restrained
- dark but readable
- focused, not flashy

### Inspiration

- Stripe dashboard clarity
- Linear hierarchy and density
- Vapi or Retell operator workflow feel
- Supabase console discipline

### Avoid

- dashboard kits pasted in without adaptation
- generic admin SaaS look
- over-decorated gradients everywhere
- cramped tables as the primary UX
- “data in boxes” layouts

## Interior Design Rules

### 1. Start with one dominant section per screen

Every screen needs a visual center of gravity.

Examples:

- Console: morning brief or queue workspace
- Calls: highlighted call activity or call log
- Setup: readiness / go-live workspace

### 2. Use fewer, larger, more intentional sections

Do not fill screens with many tiny cards.

Prefer:

- 2 to 4 strong sections

Avoid:

- 8 to 12 equally weighted boxes

### 3. Make urgency visually unmistakable

Urgent work should stand out by:

- placement
- contrast
- spacing
- action availability

Not just by a small red badge.

### 4. Design for action, not inspection

The screen should push the operator toward the next step.

Each main section should suggest action:

- call
- assign
- resolve
- inspect
- follow up

### 5. Use typography as structure

The interface should rely more on:

- heading scale
- strong spacing
- calm body text

and less on:

- repeated micro-labels
- over-badging
- tiny metadata lines everywhere

## UX Principles

### Console

When someone lands here, they should immediately know:

- what is urgent
- what is waiting
- what happened overnight
- what to do first

### Calls

When someone lands here, they should immediately know:

- which calls matter
- which ones need follow-up
- how to inspect full detail

### Setup

When someone lands here, they should immediately know:

- whether the practice is ready
- what is configured
- what is missing
- what must be done before go-live

## What To Stop Doing

- stop adding random boxes to fill space
- stop rebuilding the same dark card layout repeatedly
- stop treating every route as a totally different UI language
- stop making setup pages look like backend admin readouts
- stop using table-first composition for everything

## What To Do Instead

- preserve the three-surface architecture
- redesign each surface from first principles
- make every page lead with purpose, not metadata
- give each surface a distinct internal structure while keeping one shared design language
- prioritize readability, hierarchy, and action flow

## Working Standard

Before accepting any UI screen, ask:

1. What is this screen for?
2. What is the most important thing on it?
3. What should the operator do next?
4. Does the layout make that obvious within 3 seconds?
5. Does this feel like a real product, or like fields rendered into dark boxes?

If the answer to 5 is the second one, redesign it instead of polishing it.

## Next UI Goal

Going forward, the target is:

- keep the current functionality
- keep the 3-surface app architecture
- redesign the interiors until they feel:
  - coherent
  - premium
  - workflow-first
  - emotionally calm
  - operationally clear

This file should be used as the standing UI reference before making more frontend changes.
