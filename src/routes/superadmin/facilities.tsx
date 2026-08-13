import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/superadmin/facilities")({
  component: FacilitiesRedirectPage,
});

function FacilitiesRedirectPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: "/superadmin" });
  }, []);

  return null;
}


