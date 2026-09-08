# CalculiX CrunchiX 2.22 - estratti dal sorgente

Dal tarball ufficiale del sorgente 2.22 (`ccx_2.22.src.tar.bz2`), directory
`CalculiX/ccx_2.22/src/`. Serve dove il manuale tace: ordine dei nodi del C3D10,
formato esatto dei record del `.frd`, condizione di compilazione del solutore MT.

## `shape10tet.f` righe 19-50 - funzioni di forma del C3D10: ordine dei nodi di lato

```
      subroutine shape10tet(xi,et,ze,xl,xsj,shp,iflag)
!
!     shape functions and derivatives for a 10-node quadratic
!     isoparametric tetrahedral element. 0<=xi,et,ze<=1,xi+et+ze<=1.
!
!     iflag=1: calculate only the value of the shape functions
!     iflag=2: calculate the value of the shape functions and
!              the Jacobian determinant
!     iflag=3: calculate the value of the shape functions, the
!              value of their derivatives w.r.t. the global
!              coordinates and the Jacobian determinant
!
      implicit none
!
      integer i,j,k,iflag
!
      real*8 shp(4,10),xs(3,3),xsi(3,3),xl(3,10),sh(3),xi,et,ze,xsj,a
!
!     shape functions and their glocal derivatives
!
!     shape functions
!
      a=1.d0-xi-et-ze
      shp(4, 1)=(2.d0*a-1.d0)*a
      shp(4, 2)=xi*(2.d0*xi-1.d0)
      shp(4, 3)=et*(2.d0*et-1.d0)
      shp(4, 4)=ze*(2.d0*ze-1.d0)
      shp(4, 5)=4.d0*xi*a
      shp(4, 6)=4.d0*xi*et
      shp(4, 7)=4.d0*et*a
      shp(4, 8)=4.d0*ze*a
      shp(4, 9)=4.d0*xi*ze
```

## `frd.c` righe 1008-1030 - blocco STRESS del .frd: intestazione -4 e componenti -5

```
      frdset(&filab[174],set,&iset,istartset,iendset,ialset,
	     inum,&noutloc,&nout,nset,&noutmin,&noutplus,&iselect,
	     ngraph);
  
      frdheader(&icounter,&oner,time,&pi,noddiam,cs,&null,mode,
		&noutloc,description,kode,nmethod,f1,output,istep,iinc);
  
      fprintf(f1," -4  STRESS      6    1\n");
      fprintf(f1," -5  SXX         1    4    1    1\n");
      fprintf(f1," -5  SYY         1    4    2    2\n");
      fprintf(f1," -5  SZZ         1    4    3    3\n");
      fprintf(f1," -5  SXY         1    4    1    2\n");
      fprintf(f1," -5  SYZ         1    4    2    3\n");
      fprintf(f1," -5  SZX         1    4    3    1\n");
  
      frdselect(stn,stn,&iset,&nkcoords,inum,m1,istartset,iendset,
		ialset,ngraph,&ncomptensor,ifieldtensor,icomptensor,
		nfieldtensor,&iselect,m2,f1,output,m3);
  
    }
  }
  
  if((*nmethod!=5)||(*mode==-1)){
```

## `frdselect.c` righe 70-132 - record -1/-2: %3s%10d + n x %12.5E, sei valori per riga

```
	      if(inum[i]>0) continue;
	  }
      }

      /* storing the entities */

	for(n=1;n<=(ITG)((*ncomp+5)/6);n++){
	  if(n==1){
	    if(strcmp1(output,"asc")==0){
	      fprintf(f1,"%3s%10" ITGFORMAT "",m1,i+1);
	    }else{
	      iw=(int)(i+1);fwrite(&iw,sizeof(int),1,f1);
	    }
	    for(j=0;j<min(6,*ncomp);j++){
	      if(ifield[j]==1){
		if(strcmp1(output,"asc")==0){
		  fprintf(f1,"%12.5E",(float)field1[i*nfield[0]+icomp[j]]);
		}else if(strcmp1(output,"bin")==0){
		  fl=(float)field1[i*nfield[0]+icomp[j]];
		  fwrite(&fl,sizeof(float),1,f1);
		}else{
		  fwrite(&field1[i*nfield[0]+icomp[j]],sizeof(double),1,f1);
		}
	      }else{
		if(strcmp1(output,"asc")==0){
		  fprintf(f1,"%12.5E",(float)field2[i*nfield[1]+icomp[j]]);
		}else if(strcmp1(output,"bin")==0){
		  fl=(float)field2[i*nfield[1]+icomp[j]];
		  fwrite(&fl,sizeof(float),1,f1);
		}else{
		  fwrite(&field2[i*nfield[1]+icomp[j]],sizeof(double),1,f1);
		}
	      }
	    }
	    if(strcmp1(output,"asc")==0)fprintf(f1,"\n");
	  }else{
	    if(strcmp1(output,"asc")==0)fprintf(f1,"%3s          ",m2);
	    for(j=(n-1)*6;j<min(n*6,*ncomp);j++){
	      if(ifield[j]==1){
		if(strcmp1(output,"asc")==0){
		  fprintf(f1,"%12.5E",(float)field1[i*nfield[0]+icomp[j]]);
		}else if(strcmp1(output,"bin")==0){
		  fl=(float)field1[i*nfield[0]+icomp[j]];
		  fwrite(&fl,sizeof(float),1,f1);
		}else{
		  fwrite(&field1[i*nfield[0]+icomp[j]],sizeof(double),1,f1);
		}
	      }else{
		if(strcmp1(output,"asc")==0){
		  fprintf(f1,"%12.5E",(float)field2[i*nfield[1]+icomp[j]]);
		}else if(strcmp1(output,"bin")==0){
		  fl=(float)field2[i*nfield[1]+icomp[j]];
		  fwrite(&fl,sizeof(float),1,f1);
		}else{
		  fwrite(&field2[i*nfield[1]+icomp[j]],sizeof(double),1,f1);
		}
	      }
	    }
	    if(strcmp1(output,"asc")==0)fprintf(f1,"\n");
	  }
	}

    }
```

## `spooles.c` righe 640-720 - SPOOLES multithread solo con USE_MT; CCX_NPROC_EQUATION_SOLVER

```
	
	/* solve it! */


#ifdef USE_MT
	/* Rules for parallel solve:
           a. determining the maximum number of cpus:
              - if NUMBER_OF_CPUS>0 this is taken as the number of
                cpus in the system
              - else it is taken from _SC_NPROCESSORS_CONF, if strictly
                positive
              - else 1 cpu is assumed (default)
           b. determining the number of cpus to use
              - if CCX_NPROC_EQUATION_SOLVER>0 then use
                CCX_NPROC_EQUATION_SOLVER cpus
              - else if OMP_NUM_THREADS>0 use OMP_NUM_THREADS cpus
              - else use the maximum number of cpus
	 */
	if (num_cpus < 0) {
	    int sys_cpus;
	    char *env,*envloc,*envsys;
	    
	    num_cpus = 0;
	    sys_cpus=0;
	    
	    /* explicit user declaration prevails */
	    
	    envsys=getenv("NUMBER_OF_CPUS");
	    if(envsys){
		sys_cpus=atoi(envsys);
		if(sys_cpus<0) sys_cpus=0;
	    }
	    
	    /* automatic detection of available number of processors */
	    
	    if(sys_cpus==0){
		sys_cpus = getSystemCPUs();
		if(sys_cpus<1) sys_cpus=1;
	    }
	    
	    /* local declaration prevails, if strictly positive */
	    
	    envloc = getenv("CCX_NPROC_EQUATION_SOLVER");
	    if(envloc){
		num_cpus=atoi(envloc);
		if(num_cpus<0){
		    num_cpus=0;
		}else if(num_cpus>sys_cpus){
		    num_cpus=sys_cpus;
		}
	    }
	    
	    /* else global declaration, if any, applies */
	    
	    env = getenv("OMP_NUM_THREADS");
	    if(num_cpus==0){
		if (env)
		    num_cpus = atoi(env);
		if (num_cpus < 1) {
		    num_cpus=1;
		}else if(num_cpus>sys_cpus){
		    num_cpus=sys_cpus;
		}
	    }
	    
	}
	printf(" Using up to %d cpu(s) for spooles.\n\n", num_cpus);
	if (num_cpus > 1) {
	    /* do not use the multithreaded solver unless
	     * we have multiple threads - avoid the
		 * locking overhead
		 */
		factor_MT(&pfi, mtxA, size, msgFile,&symmetryflagi4);
	} else {
		factor(&pfi, mtxA, size, msgFile,&symmetryflagi4);
	}
#else
	printf(" Using 1 cpu for spooles.\n\n");
	factor(&pfi, mtxA, size, msgFile,&symmetryflagi4);
#endif
}
```

## `sectionprints.f` righe 1-60 - intestazione della routine di *SECTION PRINT

```
!
!     CalculiX - A 3-dimensional finite element program
!              Copyright (C) 1998-2024 Guido Dhondt
!
!     This program is free software; you can redistribute it and/or
!     modify it under the terms of the GNU General Public License as
!     published by the Free Software Foundation(version 2);
!     
!
!     This program is distributed in the hope that it will be useful,
!     but WITHOUT ANY WARRANTY; without even the implied warranty of 
!     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the 
!     GNU General Public License for more details.
!
!     You should have received a copy of the GNU General Public License
!     along with this program; if not, write to the Free Software
!     Foundation, Inc., 675 Mass Ave, Cambridge, MA 02139, USA.
!
      subroutine sectionprints(inpc,textpart,set,istartset,iendset,
     &  ialset,nset,nset_,nalset,nprint,nprint_,jout,prlab,prset,
     &  sectionprint_flag,ithermal,istep,istat,n,iline,ipol,inl,ipoinp,
     &  inp,amname,nam,itpamp,idrct,ipoinpc,nef,ier)
!
!     reading the *NODE PRINT cards in the input deck
!
      implicit none
!
      logical sectionprint_flag
!
      character*1 total,nodesys,inpc(*)
      character*6 prlab(*)
      character*80 amname(*),timepointsname
      character*81 set(*),prset(*),noset
      character*132 textpart(16),name
!
      integer istartset(*),iendset(*),ialset(*),ii,i,nam,itpamp,id,
     &  jout(2),joutl,ithermal(*),nset,nset_,nalset,nprint,nprint_,
     &  istat,n,key,ipos,iline,ipol,inl,ipoinp(2,*),inp(3,*),idrct,
     &  ipoinpc(0:*),nef,ier,istep
!
      if(istep.lt.1) then
         write(*,*) '*ERROR reading *SECTION PRINT: *SECTION PRINT'
         write(*,*) '       should only be used within a *STEP' 
         write(*,*) '       definition'
         ier=1
         return
      endif
!
      nodesys='G'
!
!     reset the facial print requests (nodal and element print requests, 
!     if any,are kept)
!
      if(.not.sectionprint_flag) then
         ii=0
         do i=1,nprint
            if((prlab(i)(1:4).eq.'DRAG').or.(prlab(i)(1:4).eq.'FLUX')
     &     .or.(prlab(i)(1:3).eq.'SOF').or.(prlab(i)(1:3).eq.'SOM')
     &     .or.(prlab(i)(1:6).eq.'SOAREA'))
     &           cycle
```
