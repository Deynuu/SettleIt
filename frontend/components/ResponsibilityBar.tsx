export function ResponsibilityBar({ claimantFault, respondentFault }: { claimantFault: number; respondentFault: number }) {
  return (
    <div className="score" role="group" aria-label="Fault split">
      <div className="score-row">
        <div className="score-label"><span>Claimant at fault</span><span>{claimantFault}%</span></div>
        <div className="score-bar"><div className="score-fill claimant" style={{ width: `${claimantFault}%` }} /></div>
      </div>
      <div className="score-row">
        <div className="score-label"><span>Respondent at fault</span><span>{respondentFault}%</span></div>
        <div className="score-bar"><div className="score-fill respondent" style={{ width: `${respondentFault}%` }} /></div>
      </div>
    </div>
  );
}
