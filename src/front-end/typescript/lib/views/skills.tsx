import { EMPTY_STRING } from "front-end/config";
import { component } from "front-end/lib/framework";
import Badge from "front-end/lib/views/badge";
import React from "react";

export interface Props {
  skills: string[];
  className?: string;
}

const Skills: component.base.View<Props> = ({ skills, className = "" }) => {
  return (
    <div className={`d-flex flex-wrap ${className}`}>
      {skills.length
        ? skills.map((skill, i, arr) => (
            <Badge
              key={`skill-${i}`}
              className={`mb-2 ${i < arr.length - 1 ? "me-2" : ""}`}
              text={skill}
              color="c-skills-bg"
            />
          ))
        : EMPTY_STRING}
    </div>
  );
};

export default Skills;
