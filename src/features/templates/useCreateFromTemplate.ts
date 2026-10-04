import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { errorMessage, useMutation, useQueryClient } from "@/lib/client/queries";
import { createProjectFromTemplate } from "@/lib/server-fns/projects.functions";

/** Creates a real project from a starter template and opens it in the builder. */
export function useCreateFromTemplate() {
  const navigate = useNavigate();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) => createProjectFromTemplate({ data: { templateId } }),
    onSuccess: ({ projectId }) => {
      void client.invalidateQueries({ queryKey: ["projects"] });
      void navigate({ to: "/projects/$projectId", params: { projectId } });
    },
    onError: (error) =>
      toast.error("Could not create the project", { description: errorMessage(error) }),
  });
}
