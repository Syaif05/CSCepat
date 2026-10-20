import { describe, it, expect } from "vitest";
import { STARTER_FLOWS } from "@/lib/template-engine/starter-flows";
import {
  createFlowTemplateAction,
  updateFlowTemplateAction,
  getFlowTemplateAction,
} from "../actions/flow-template-actions";
import { TemplateFlowDefinition } from "@/lib/template-engine/flow-types";

describe("Fase 2.2: Flow Builder & Actions", () => {
  const starterFlow = STARTER_FLOWS[0];

  it("berhasil membuat flow template baru melalui createFlowTemplateAction (mock/offline mode)", async () => {
    const res = await createFlowTemplateAction(starterFlow);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.schema_version).toBe(2);
      expect(res.data.title).toBe(starterFlow.title);
      expect(res.data.nodes.length).toBe(starterFlow.nodes.length);
    }
  });

  it("menolak pembuatan flow template baru jika data tidak valid", async () => {
    const invalidFlow = {
      ...starterFlow,
      title: "", // Title kosong dilarang
    };
    const res = await createFlowTemplateAction(invalidFlow as TemplateFlowDefinition);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.code).toBe("VALIDATION_ERROR");
    }
  });

  it("berhasil memperbarui flow template melalui updateFlowTemplateAction", async () => {
    const res = await updateFlowTemplateAction({
      id: starterFlow.id,
      expected_version: starterFlow.version,
      template: {
        ...starterFlow,
        title: "Judul Alur Diperbarui",
      },
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.title).toBe("Judul Alur Diperbarui");
    }
  });

  it("berhasil mengambil flow template melalui getFlowTemplateAction", async () => {
    const res = await getFlowTemplateAction(starterFlow.id);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.id).toBe(starterFlow.id);
      expect(res.data.nodes.length).toBeGreaterThan(0);
    }
  });

  it("memiliki integritas hubungan antar-node pada preset starter flow", () => {
    // Memastikan setiap node pada template starter memiliki target cabang yang valid
    const nodeIds = new Set(starterFlow.nodes.map((n) => n.id));
    expect(nodeIds.has(starterFlow.rootNodeId)).toBe(true);

    starterFlow.nodes.forEach((node) => {
      if (node.defaultNextNodeId) {
        expect(nodeIds.has(node.defaultNextNodeId)).toBe(true);
      }
      node.branches.forEach((branch) => {
        expect(nodeIds.has(branch.targetNodeId)).toBe(true);
      });
    });
  });
});
