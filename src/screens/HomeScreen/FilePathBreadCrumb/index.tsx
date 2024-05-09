import React from 'react';
import BreadCrumbs from '../../../common/components/BreadCrumbs';
import { usePathBreadCrumbs } from '../../../common/hooks/usePathBreadCrumbs';
import { useHomeContext } from '../HomeScreenContext';

const FilePathBreadCrumb: React.FC = () => {
  const homeCtx = useHomeContext();
  const breadCrumbs = usePathBreadCrumbs(homeCtx.route);

  return <BreadCrumbs items={breadCrumbs} />;
};

export default FilePathBreadCrumb;
