import logo from "../assets/logo.jpg";

// BabyWatch logo — uses the family's logo image everywhere (nav, boot
// screen, auth screen). `size` controls the rendered diameter; `dark` is
// kept for prop compatibility with existing call sites but no longer
// changes the image itself.
export default function BabyLogo({ size = 40, dark = false }) {
  return (
    <img
      src={logo}
      alt="BabyWatch"
      width={size}
      height={size}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block" }}
    />
  );
}
