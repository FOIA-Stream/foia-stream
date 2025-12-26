/**
 * Copyright (c) 2025 Foia Stream
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * @file Graph Data Structure Tests
 * @module tests/dsa/graph
 * @author FOIA Stream Team
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { addValidatedEdge, Graph, isValidVertexId } from '../../src/dsa/graph';

describe('Graph', () => {
  let graph: Graph<string>;

  beforeEach(() => {
    graph = new Graph<string>();
  });

  describe('constructor', () => {
    it('should create an empty directed graph by default', () => {
      expect(graph.vertexCount).toBe(0);
      expect(graph.edgeCount).toBe(0);
    });

    it('should create undirected graph when specified', () => {
      const undirected = new Graph<string>({ directed: false });
      expect(undirected).toBeInstanceOf(Graph);
    });
  });

  describe('addVertex', () => {
    it('should add a vertex', () => {
      graph.addVertex('DOJ');
      expect(graph.vertexCount).toBe(1);
      expect(graph.hasVertex('DOJ')).toBe(true);
    });

    it('should not add duplicate vertices', () => {
      graph.addVertex('DOJ');
      graph.addVertex('DOJ');
      expect(graph.vertexCount).toBe(1);
    });

    it('should support method chaining', () => {
      const result = graph.addVertex('DOJ').addVertex('FBI');
      expect(result).toBe(graph);
      expect(graph.vertexCount).toBe(2);
    });

    it('should add vertex with metadata', () => {
      graph.addVertex('DOJ', { level: 'federal', budget: 1000000 });
      const metadata = graph.getVertexMetadata('DOJ');
      expect(metadata?.level).toBe('federal');
    });
  });

  describe('addVertices', () => {
    it('should add multiple vertices', () => {
      graph.addVertices(['DOJ', 'FBI', 'CIA', 'NSA']);
      expect(graph.vertexCount).toBe(4);
    });
  });

  describe('addEdge', () => {
    it('should add an edge between vertices', () => {
      graph.addEdge('DOJ', 'FBI');
      expect(graph.hasEdge('DOJ', 'FBI')).toBe(true);
      expect(graph.edgeCount).toBe(1);
    });

    it('should auto-create vertices if they do not exist', () => {
      graph.addEdge('DOJ', 'FBI');
      expect(graph.hasVertex('DOJ')).toBe(true);
      expect(graph.hasVertex('FBI')).toBe(true);
    });

    it('should add weighted edge', () => {
      graph.addEdge('DOJ', 'FBI', 5);
      const neighbors = graph.getNeighbors('DOJ');
      expect(neighbors[0]?.weight).toBe(5);
    });

    it('should update edge weight if edge exists', () => {
      graph.addEdge('DOJ', 'FBI', 5);
      graph.addEdge('DOJ', 'FBI', 10);
      const neighbors = graph.getNeighbors('DOJ');
      expect(neighbors[0]?.weight).toBe(10);
    });

    it('should add bidirectional edge for undirected graph', () => {
      const undirected = new Graph<string>({ directed: false });
      undirected.addEdge('A', 'B');
      expect(undirected.hasEdge('A', 'B')).toBe(true);
      expect(undirected.hasEdge('B', 'A')).toBe(true);
    });
  });

  describe('removeVertex', () => {
    beforeEach(() => {
      graph.addEdge('DOJ', 'FBI');
      graph.addEdge('DOJ', 'DEA');
      graph.addEdge('FBI', 'DEA');
    });

    it('should remove vertex and its edges', () => {
      expect(graph.removeVertex('FBI')).toBe(true);
      expect(graph.hasVertex('FBI')).toBe(false);
      expect(graph.hasEdge('DOJ', 'FBI')).toBe(false);
    });

    it('should return false for non-existent vertex', () => {
      expect(graph.removeVertex('XYZ')).toBe(false);
    });
  });

  describe('removeEdge', () => {
    beforeEach(() => {
      graph.addEdge('DOJ', 'FBI');
    });

    it('should remove an edge', () => {
      expect(graph.removeEdge('DOJ', 'FBI')).toBe(true);
      expect(graph.hasEdge('DOJ', 'FBI')).toBe(false);
    });

    it('should return false for non-existent edge', () => {
      expect(graph.removeEdge('DOJ', 'CIA')).toBe(false);
    });
  });

  describe('getNeighbors', () => {
    it('should return neighbors with edges', () => {
      graph.addEdge('DOJ', 'FBI', 1);
      graph.addEdge('DOJ', 'DEA', 2);
      const neighbors = graph.getNeighbors('DOJ');
      expect(neighbors.length).toBe(2);
    });

    it('should return empty array for non-existent vertex', () => {
      const neighbors = graph.getNeighbors('XYZ');
      expect(neighbors.length).toBe(0);
    });
  });

  describe('getVertices', () => {
    it('should return all vertices', () => {
      graph.addVertices(['A', 'B', 'C']);
      const vertices = graph.getVertices();
      expect(vertices).toContain('A');
      expect(vertices).toContain('B');
      expect(vertices).toContain('C');
    });
  });

  describe('bfs', () => {
    beforeEach(() => {
      graph.addEdge('DOJ', 'FBI');
      graph.addEdge('DOJ', 'DEA');
      graph.addEdge('FBI', 'ATF');
      graph.addEdge('DEA', 'ICE');
    });

    it('should traverse graph in breadth-first order', () => {
      const result = graph.bfs('DOJ');
      expect(result.vertices[0]).toBe('DOJ');
      expect(result.vertices).toContain('FBI');
      expect(result.vertices).toContain('DEA');
    });

    it('should track distances from source', () => {
      const result = graph.bfs('DOJ');
      expect(result.distances.get('DOJ')).toBe(0);
      expect(result.distances.get('FBI')).toBe(1);
      expect(result.distances.get('ATF')).toBe(2);
    });

    it('should track parent relationships', () => {
      const result = graph.bfs('DOJ');
      expect(result.parents.get('DOJ')).toBeNull();
      expect(result.parents.get('FBI')).toBe('DOJ');
    });

    it('should return empty for non-existent start vertex', () => {
      const result = graph.bfs('XYZ');
      expect(result.vertices.length).toBe(0);
    });
  });

  describe('dfs', () => {
    beforeEach(() => {
      graph.addEdge('DOJ', 'FBI');
      graph.addEdge('DOJ', 'DEA');
      graph.addEdge('FBI', 'ATF');
    });

    it('should traverse graph in depth-first order', () => {
      const result = graph.dfs('DOJ');
      expect(result.vertices[0]).toBe('DOJ');
      expect(result.vertices).toContain('FBI');
      expect(result.vertices).toContain('DEA');
      expect(result.vertices).toContain('ATF');
    });

    it('should track parent relationships', () => {
      const result = graph.dfs('DOJ');
      expect(result.parents.get('DOJ')).toBeNull();
    });

    it('should return empty for non-existent start vertex', () => {
      const result = graph.dfs('XYZ');
      expect(result.vertices.length).toBe(0);
    });
  });

  describe('findShortestPath', () => {
    beforeEach(() => {
      graph.addEdge('DOJ', 'FBI', 1);
      graph.addEdge('DOJ', 'DEA', 3);
      graph.addEdge('FBI', 'DEA', 1);
      graph.addEdge('DEA', 'ICE', 2);
    });

    it('should find shortest path between vertices', () => {
      const result = graph.findShortestPath('DOJ', 'ICE');
      expect(result.found).toBe(true);
      expect(result.path).toContain('DOJ');
      expect(result.path).toContain('ICE');
    });

    it('should return optimal distance', () => {
      const result = graph.findShortestPath('DOJ', 'DEA');
      // DOJ -> FBI -> DEA = 2, vs DOJ -> DEA = 3
      expect(result.distance).toBe(2);
    });

    it('should return not found for unreachable vertex', () => {
      graph.addVertex('Isolated');
      const result = graph.findShortestPath('DOJ', 'Isolated');
      expect(result.found).toBe(false);
    });

    it('should handle path to self', () => {
      const result = graph.findShortestPath('DOJ', 'DOJ');
      expect(result.found).toBe(true);
      expect(result.distance).toBe(0);
    });
  });

  describe('Agency hierarchy scenarios', () => {
    it('should model federal agency hierarchy', () => {
      // Build hierarchy
      graph.addEdge('Federal Government', 'DOJ', 1);
      graph.addEdge('Federal Government', 'DHS', 1);
      graph.addEdge('DOJ', 'FBI', 1);
      graph.addEdge('DOJ', 'DEA', 1);
      graph.addEdge('DOJ', 'ATF', 1);
      graph.addEdge('DHS', 'ICE', 1);
      graph.addEdge('DHS', 'CBP', 1);
      graph.addEdge('DHS', 'TSA', 1);

      const dojResult = graph.bfs('DOJ');
      expect(dojResult.vertices).toContain('FBI');
      expect(dojResult.vertices).toContain('DEA');
      expect(dojResult.vertices).toContain('ATF');
      expect(dojResult.vertices).not.toContain('ICE'); // Different branch
    });

    it('should find routing path for FOIA request', () => {
      graph.addEdge('Public', 'FOIA Office', 1);
      graph.addEdge('FOIA Office', 'Review Board', 2);
      graph.addEdge('Review Board', 'Legal', 3);
      graph.addEdge('Legal', 'Release', 1);

      const result = graph.findShortestPath('Public', 'Release');
      expect(result.found).toBe(true);
      expect(result.path.length).toBe(5);
    });
  });
});

describe('isValidVertexId', () => {
  it('should return true for valid string vertex ID', () => {
    expect(isValidVertexId('DOJ')).toBe(true);
    expect(isValidVertexId('FBI-001')).toBe(true);
  });

  it('should return false for empty string', () => {
    expect(isValidVertexId('')).toBe(false);
  });

  it('should accept whitespace-only string (schema only checks minLength)', () => {
    // Note: VertexIdSchema only requires minLength(1), not non-whitespace
    expect(isValidVertexId('   ')).toBe(true);
  });

  it('should return false for non-string values', () => {
    expect(isValidVertexId(null)).toBe(false);
    expect(isValidVertexId(undefined)).toBe(false);
    expect(isValidVertexId(123 as unknown as string)).toBe(false);
  });
});

describe('addValidatedEdge', () => {
  it('should add edge with validated source and target', () => {
    const graph = new Graph<string>();
    const result = addValidatedEdge(graph, 'DOJ', 'FBI', 1);
    expect(result).toBe(true);
    expect(graph.hasEdge('DOJ', 'FBI')).toBe(true);
  });

  it('should reject invalid source', () => {
    const graph = new Graph<string>();
    const result = addValidatedEdge(graph, '', 'FBI', 1);
    expect(result).toBe(false);
  });

  it('should reject invalid target', () => {
    const graph = new Graph<string>();
    const result = addValidatedEdge(graph, 'DOJ', '', 1);
    expect(result).toBe(false);
  });

  it('should accept negative weight (schema only validates finite numbers)', () => {
    // Note: GraphEdgeSchema only requires finite number; validation doesn't restrict to non-negative
    const graph = new Graph<string>();
    const result = addValidatedEdge(graph, 'DOJ', 'FBI', -1);
    expect(result).toBe(true);
  });
});
