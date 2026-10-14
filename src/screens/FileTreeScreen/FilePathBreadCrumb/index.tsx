import React from 'react';
import BreadCrumbs from '../../../common/components/BreadCrumbs';
import { usePathBreadCrumbs } from '../../../common/hooks/usePathBreadCrumbs';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';

const FilePathBreadCrumb: React.FC = () => {
  const route = useSelector((state: RootState) => state.fileTree.route);
  const breadCrumbs = usePathBreadCrumbs(route);

  return <BreadCrumbs items={breadCrumbs} />;
};

export default FilePathBreadCrumb;
