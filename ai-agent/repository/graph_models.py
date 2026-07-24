from dataclasses import dataclass, field


@dataclass
class GraphNode:
    id: str
    type: str
    name: str
    metadata: dict = field(default_factory=dict)


@dataclass
class GraphEdge:
    source: str
    target: str
    relation: str


@dataclass
class KnowledgeGraph:
    nodes: list[GraphNode] = field(default_factory=list)
    edges: list[GraphEdge] = field(default_factory=list)

    def add_node(self, node: GraphNode):
        self.nodes.append(node)

    def add_edge(self, edge: GraphEdge):
        self.edges.append(edge)