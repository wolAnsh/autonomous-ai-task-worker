/**
 * ToolRegistry - Registry for agent tools with parameter validation and execution tracking
 */

class ToolRegistry {
  constructor() {
    this.tools = new Map();
  }

  registerTool(name, definition, handler) {
    this.tools.set(name, {
      name,
      description: definition.description || '',
      parameters: definition.parameters || {},
      handler
    });
  }

  hasTool(name) {
    return this.tools.has(name);
  }

  getTool(name) {
    return this.tools.get(name);
  }

  listTools() {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }));
  }

  async executeTool(name, args = {}, context = {}) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" is not registered in the tool registry.`);
    }

    try {
      const result = await tool.handler(args, context);
      return {
        success: true,
        data: result,
        error: null
      };
    } catch (err) {
      return {
        success: false,
        data: null,
        error: err.message || String(err),
        errorCode: err.code || 'TOOL_EXECUTION_ERROR',
        details: err.details || null
      };
    }
  }
}

module.exports = ToolRegistry;
