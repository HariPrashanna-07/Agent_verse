export interface RoadmapDay {
    day: number;
    topic: string;
    task: string;
}

export interface InterviewEvaluationData {
    scores: {
        overall: number;
        technical_accuracy: number;
        communication: number;
        problem_solving: number;
    };
    strengths: string[];
    weaknesses: string[];
    detailed_feedback?: string[];
    roadmap?: RoadmapDay[];
}
