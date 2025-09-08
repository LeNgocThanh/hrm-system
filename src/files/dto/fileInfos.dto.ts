export class FileInfoDto {
  fileName: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
  isDirectory: boolean;
  isFile: boolean;
  path: string;
}