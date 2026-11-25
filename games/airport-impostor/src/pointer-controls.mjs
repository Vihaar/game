// Independent pointer ownership lets one local player move while the other taps security.
export function createPointerControls() {
  const owners = new Map();
  const controls = new Set(["up", "down", "left", "right", "interact"]);
  function snapshot() {
    const held = [...owners.values()];
    const axis = (positive, negative) =>
      Math.sign(
        held.filter((value) => value === positive).length -
          held.filter((value) => value === negative).length,
      );
    return {
      dx: axis("right", "left"),
      dy: axis("down", "up"),
      held: held.includes("interact"),
    };
  }
  return {
    press(pointerId, control) {
      if (!Number.isInteger(pointerId) || !controls.has(control))
        return snapshot();
      owners.set(pointerId, control);
      return snapshot();
    },
    release(pointerId) {
      owners.delete(pointerId);
      return snapshot();
    },
    reset() {
      owners.clear();
      return snapshot();
    },
    snapshot,
  };
}
