export type PhysicsHelpTopic =
  | "gravity"
  | "friction"
  | "angle"
  | "massVsWeight"
  | "rolling"
  | "race"
  | "materialGrip";

export type PhysicsHelpEntry = {
  title: string;
  body: string;
};

export const PHYSICS_HELP: Record<PhysicsHelpTopic, PhysicsHelpEntry> = {
  gravity: {
    title: "Gravity",
    body:
      "Gravity pulls everything downward toward Earth. On a slope, that pull is partly along the ramp, which makes round objects roll downhill. The pull does not care how heavy the ball is — it always points down.",
  },
  friction: {
    title: "Friction",
    body:
      "Friction is the grip between the ball and the track. More friction (higher μ) fights motion, so the ball speeds up less or can stop on a shallow slope. Less friction means an easier roll.",
  },
  angle: {
    title: "Ramp angle",
    body:
      "A steeper ramp tilts gravity more along the track, so the ball accelerates faster. A gentle angle gives a slower, easier roll. If friction is too strong for the angle, the ball will not start moving.",
  },
  massVsWeight: {
    title: "Mass and speed",
    body:
      "A steel ball is heavier than a plastic one, but on the same track they roll downhill at the same speed. Mass does not change rolling acceleration here — only friction and the shape of the track do.",
  },
  rolling: {
    title: "Rolling",
    body:
      "A ball spins as it rolls. Some energy goes into rotation, so it does not slide freely like a block. That is why we use the rolling formula — it matches how real balls behave on ramps.",
  },
  race: {
    title: "Race mode",
    body:
      "Add two or more balls and guess which will cross the finish first. After the run, compare your guess to the winner. Different materials can grip the track differently, so order can change!",
  },
  materialGrip: {
    title: "Material grip",
    body:
      "Each material has its own grip multiplier on top of the friction slider. Rubber tends to grab more; steel slides a bit easier. That is why two balls with the same μ setting can still finish in different order.",
  },
};

export const PHYSICS_HELP_BUTTONS: { topic: PhysicsHelpTopic; label: string }[] =
  [
    { topic: "gravity", label: "Gravity" },
    { topic: "friction", label: "Friction" },
    { topic: "angle", label: "Angle" },
    { topic: "massVsWeight", label: "Mass" },
    { topic: "rolling", label: "Rolling" },
    { topic: "race", label: "Race" },
    { topic: "materialGrip", label: "Grip" },
  ];
