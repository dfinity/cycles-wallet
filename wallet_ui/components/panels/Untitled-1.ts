type Example =
  | { CanistersCreated: { foo: "foo" } }
  | { CanistersDestroyed: { bar: "bar" } };

const x: Example = { CanistersCreated: { foo: "foo" } };

if ("CanistersDestroyed" in x) {
  console.log("foo");
}
