import React from 'react';
import BreadCrumbs from '../../../common/components/BreadCrumbs';
import { usePathBreadCrumbs } from '../../../common/hooks/usePathBreadCrumbs';
import { useFileTreeContext } from '../FileTreeContext';

const FilePathBreadCrumb: React.FC = () => {
  const fileTreeCtx = useFileTreeContext();
  const breadCrumbs = usePathBreadCrumbs(fileTreeCtx.route);

  return <BreadCrumbs items={breadCrumbs} />;
};

export default FilePathBreadCrumb;
