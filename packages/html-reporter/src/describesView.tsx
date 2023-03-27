/*
  Copyright (c) Microsoft Corporation.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

import React from 'react';
import { DescribeView } from './describeView';
import type { Filter } from './filter';
import { TestFileView } from './testFileView';
import type { HTMLReport, TestCaseSummary, TestFileSummary } from './types';

export const DescribesVeiw: React.FC<{
  report?: HTMLReport,
  filter: Filter;
  expandedDescribes: Map<string, boolean>,
  setExpandedDescribes: (value: Map<string, boolean>) => void,
  expandedFiles: Map<string, boolean>,
  setExpandedFiles: (value: Map<string, boolean>) => void,
}> = ({ report, filter, expandedDescribes, setExpandedDescribes, expandedFiles, setExpandedFiles }) => {

  const filteredFiles = React.useMemo(() => {
    const result: { file: TestFileSummary, defaultExpanded: boolean }[] = [];
    let visibleTests = 0;
    for (const file of report?.files || []) {
      const tests = file.tests.filter(t => filter.matches(t));
      visibleTests += tests.length;
      if (tests.length)
        result.push({ file, defaultExpanded: visibleTests < 200 });
    }
    return result;
  }, [report, filter]);

  const preparedDescribesResult = React.useMemo(() => {
    const uniqueDescribesResult = uniqueDescribes(filteredFiles.map(file => file.file));
    const sortDescridesResult = sortDescrides(uniqueDescribesResult);
    const tests = filteredFiles.map(f => f.file.tests.filter(t => filter.matches(t))).flat();
    return prepareDescribes(tests, sortDescridesResult, [], 0);
  }, [filteredFiles, filter]);

  const filesTestsWithoutDescribe = React.useMemo(() => {
    return filteredFiles.filter(f => f.file.tests.filter(t => !t.path.length).length);
  }, [filteredFiles]);

  return <>
    {report && preparedDescribesResult.length > 0 &&
      <RenderDescribe
        preparedDescribesResult={preparedDescribesResult}
        filter={filter}
        report={report}
        expandedDescribes={expandedDescribes}
        setExpandedDescribes={setExpandedDescribes}
      />}
    {filesTestsWithoutDescribe.length > 0 && filesTestsWithoutDescribe.map(({ file, defaultExpanded }) => {
      return <TestFileView
        key={`file-${file.fileId}`}
        report={report!}
        file={file}
        isFileExpanded={fileId => {
          const value = expandedFiles.get(fileId);
          if (value === undefined)
            return defaultExpanded;
          return !!value;
        }}
        setFileExpanded={(fileId, expanded) => {
          const newExpanded = new Map(expandedFiles);
          newExpanded.set(fileId, expanded);
          setExpandedFiles(newExpanded);
        }}
        filter={filter}>
      </TestFileView>;
    })}
  </>;
};

const RenderDescribe: React.FC<{
  preparedDescribesResult?: DescribedTests[],
  filter: Filter,
  report: HTMLReport,
  expandedDescribes: Map<string, boolean>,
  setExpandedDescribes: (value: Map<string, boolean>) => void
}> = ({
  preparedDescribesResult,
  filter,
  report,
  expandedDescribes,
  setExpandedDescribes
}) => {

  return <>
    {preparedDescribesResult?.length && preparedDescribesResult.map(({ describe, describePath, defaultExpanded, tests }) => {
      if (!describe || !describePath)
        return null;
      return <React.Fragment key={describePath}>
        <DescribeView
          key={`file-${describePath}`}
          report={report}
          describe={describe}
          tests={tests as TestCaseSummary[]}
          isDescribeExpanded={desc => {
            const value = expandedDescribes.get(desc);
            if (value === undefined)
              return defaultExpanded!;
            return !!value;
          }}
          setDescribeExpanded={(describe, expanded) => {
            const newExpanded = new Map(expandedDescribes);
            newExpanded.set(describe, expanded);
            setExpandedDescribes(newExpanded);
          }}
          filter={filter}
        >
          <RenderDescribe
            preparedDescribesResult={tests}
            filter={filter}
            report={report}
            expandedDescribes={expandedDescribes}
            setExpandedDescribes={setExpandedDescribes}
          />
        </DescribeView>
      </React.Fragment>;
    })}
  </>;
};

const uniqueDescribes = (files: TestFileSummary[]) => {
  const temp = new Array();
  for (const file of files) {
    for (const test of file.tests) {
      if (test.path.length > 0 && !test.path.includes(''))
        temp.push(test.path);

    }
  }
  const stringify = temp.map(item => item.join(' > '));
  return stringify.filter((item, index) => stringify.indexOf(item) === index).map(item => item.split(' > '));
};

const descrideDeep = (describes: string[][]) => {
  let deep = 0;
  for (const describe of describes) {
    if (describe.length > deep)
      deep = describe.length;

  }
  return deep;
};

const sortDescrides = (uniqueDescribesResult: string[][]) => {
  const deep = descrideDeep(uniqueDescribesResult);
  uniqueDescribesResult.sort((a, b) => {
    for (let i = 0; i < deep; i++) {
      if (a[i] === b[i])
        continue;

      if (a[i] === undefined)
        return -1;

      if (b[i] === undefined)
        return 1;

      if (a[i] > b[i])
        return 1;

      if (a[i] < b[i])
        return -1;

    }
    return 0;
  });

  return uniqueDescribesResult;
};

type DescribedTests = Partial<TestCaseSummary> & {
  describe?: string
  describePath?: string
  defaultExpanded?: boolean
  tests?: DescribedTests[]
};

const prepareDescribes = (tests: TestCaseSummary[], describes: string[][], targetDescribe: string[], index: number): DescribedTests[] => {
  const result: DescribedTests[] = [];
  const uniqueDescribesByIndex = describes.map(describe => describe[index]).filter((item, index, self) => self.indexOf(item) === index);

  if (!uniqueDescribesByIndex) return result;

  for (const uniqueDescribe of uniqueDescribesByIndex) {
    if (!uniqueDescribe)
      continue;

    const describePath = `${targetDescribe.length ? targetDescribe.join(' > ') : ''}${targetDescribe.length ? ' > ' : ''}${uniqueDescribe}`;
    const testsByDescribe = tests.filter(test => test.path.join(' > ') === describePath);
    result.push({ describe: uniqueDescribe, describePath: describePath, tests: testsByDescribe, defaultExpanded: false });
    const nextLevel = result.find(item => item.describe === uniqueDescribe);
    if (nextLevel) {
      const newTargetDescribe = [...targetDescribe, uniqueDescribe];
      const newDescribes = describes.filter(describe => describe[index] === uniqueDescribe);
      nextLevel.tests?.push(...prepareDescribes(tests, newDescribes, newTargetDescribe, index + 1));
    }
  }
  return result;
};
