/**
 * Length feedback describes the actual policy without claiming to measure
 * password entropy or enforcing additional character-class requirements.
 */
export function PasswordGuidance({ password }: { password: string }) {
  const length = password.length;
  const feedback =
    length > 128
      ? "Too long: use at most 128 characters."
      : length > 0 && length < 8
        ? "Too short: use at least 8 characters."
        : length >= 12
          ? "Recommended length reached; uniqueness still matters."
          : "Use 8–128 characters; 12 or more is recommended.";

  return (
    <>{feedback} Choose a unique passphrase and avoid reusing passwords.</>
  );
}
