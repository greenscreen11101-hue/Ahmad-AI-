
import React from 'react';
import type { Skill, TaughtSkill } from '../types';

interface UpgradeCenterProps {
  skills: Skill[];
  taughtSkills: TaughtSkill[];
}

const SkillCard: React.FC<{ skill: Skill }> = ({ skill }) => (
  <details className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden transition-shadow hover:shadow-lg border border-gray-200 dark:border-gray-700">
    <summary className="p-4 cursor-pointer flex justify-between items-center group">
      <div>
        <h3 className="font-semibold text-primary-600 dark:text-primary-500">{skill.name}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">{skill.description}</p>
        <p className="text-xs text-gray-500 mt-1">Learned on: {new Date(skill.timestamp).toLocaleDateString()}</p>
      </div>
      <i className="fa-solid fa-chevron-down text-gray-400 dark:text-gray-500 transition-transform transform group-open:rotate-180" aria-hidden="true"></i>
    </summary>
    <div className="bg-gray-50 dark:bg-gray-900 p-4 border-t border-gray-200 dark:border-gray-700">
      <pre className="bg-gray-100 dark:bg-black p-3 rounded-md overflow-x-auto border border-gray-200 dark:border-gray-800">
        <code className="text-sm text-cyan-700 dark:text-cyan-300 font-mono">
          {skill.code}
        </code>
      </pre>
    </div>
  </details>
);

const TaughtSkillCard: React.FC<{ skill: TaughtSkill }> = ({ skill }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
    <h3 className="font-semibold text-teal-600 dark:text-teal-400">{skill.name}</h3>
    <p className="text-xs text-gray-500 mt-1 mb-2">Taught on: {new Date(skill.timestamp).toLocaleDateString()}</p>
    <div className="space-y-2 text-sm">
        <p><strong className="text-gray-700 dark:text-gray-400">Example Command:</strong> <span className="text-gray-600 dark:text-gray-300">"{skill.commandExample}"</span></p>
        <p><strong className="text-gray-700 dark:text-gray-400">Desired Outcome:</strong> <span className="text-gray-600 dark:text-gray-300">{skill.outcome}</span></p>
        {skill.parameters.length > 0 && (
            <div>
                <strong className="text-gray-700 dark:text-gray-400">Parameters:</strong>
                <div className="flex flex-wrap gap-2 mt-1">
                    {skill.parameters.map(param => (
                        <span key={param} className="bg-gray-100 dark:bg-gray-700 text-teal-700 dark:text-teal-300 text-xs font-mono px-2 py-1 rounded-md">{param}</span>
                    ))}
                </div>
            </div>
        )}
    </div>
  </div>
);


export const UpgradeCenter: React.FC<UpgradeCenterProps> = ({ skills, taughtSkills }) => {
  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 flex-1 overflow-y-auto transition-colors">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Upgrade Center</h2>
      
      <section>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <i className="fa-solid fa-brain text-primary-500" aria-hidden="true"></i>
            AI-Learned Skills
        </h3>
        {skills.length > 0 ? (
          <div className="space-y-4">
            {skills.slice().reverse().map((skill) => (
              <SkillCard key={skill.timestamp} skill={skill} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 px-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <i className="fa-solid fa-box-open text-4xl text-gray-300 dark:text-gray-600 mb-4" aria-hidden="true"></i>
            <h3 className="font-semibold text-gray-800 dark:text-white">No Skills Learned Yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Try asking Ahmad AI to learn something new in the chat!</p>
            <p className="text-gray-400 dark:text-gray-500 mt-2 text-xs">Example: "Ahmad, learn how to calculate a tip."</p>
          </div>
        )}
      </section>

      <div className="my-8 border-t border-gray-200 dark:border-gray-700"></div>

       <section>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <i className="fa-solid fa-chalkboard-user text-teal-500 dark:text-teal-400" aria-hidden="true"></i>
            User-Taught Skill Specifications
        </h3>
        {taughtSkills.length > 0 ? (
          <div className="space-y-4">
            {taughtSkills.slice().reverse().map((skill) => (
              <TaughtSkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 px-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <i className="fa-solid fa-file-circle-question text-4xl text-gray-300 dark:text-gray-600 mb-4" aria-hidden="true"></i>
            <h3 className="font-semibold text-gray-800 dark:text-white">No Skills Taught Yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Go to the "Teach" section to guide Ahmad AI on how to perform new tasks.</p>
          </div>
        )}
      </section>
    </div>
  );
};
